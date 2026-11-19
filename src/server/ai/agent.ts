import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { aiConversations, aiMessages, categories, events } from "../db/schema";
import { latestPlan } from "../services/planning";
import { costMicroUsd, getEngine, type ChatTurn } from "./engines";
import { PROMPT_VERSION, plannerSystemPrompt } from "./prompts";
import { eventSnapshot, planStateText, type UiPayload } from "./tools";

const HISTORY_TURNS = 12; // controla custo: o estado do evento vai estruturado no system prompt

export type ChatOutput = {
  conversationId: string;
  eventId: string;
  reply: string;
  engine: string;
  ui: UiPayload;
  event: Awaited<ReturnType<typeof eventSnapshot>>;
  plan: Awaited<ReturnType<typeof serializePlan>>;
};

export async function chat(input: {
  message: string;
  conversationId?: string | null;
  userId: string | null;
  anonKey: string | null;
}): Promise<ChatOutput> {
  const engine = await getEngine();
  const owner = input.userId ? { userId: input.userId } : { anonKey: input.anonKey };

  // Carrega a conversa apenas se pertencer a quem pede (usuário ou chave anônima)
  let conv = input.conversationId
    ? await db.query.aiConversations.findFirst({
        where: and(
          eq(aiConversations.id, input.conversationId),
          input.userId ? eq(aiConversations.userId, input.userId) : eq(aiConversations.anonymousKey, input.anonKey ?? "__none__"),
        ),
      })
    : null;

  if (!conv) {
    const [ev] = await db
      .insert(events)
      .values({ title: "Novo evento", ownerId: input.userId, anonymousKey: input.userId ? null : input.anonKey })
      .returning();
    [conv] = await db
      .insert(aiConversations)
      .values({
        userId: owner.userId ?? null,
        anonymousKey: owner.userId ? null : (input.anonKey ?? null),
        eventId: ev.id,
        provider: engine.id,
        model: engine.model,
        promptVersion: PROMPT_VERSION,
      })
      .returning();
  }
  const eventId = conv.eventId!;

  const historyRows = await db
    .select({ role: aiMessages.role, content: aiMessages.content })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conv.id))
    .orderBy(desc(aiMessages.createdAt))
    .limit(HISTORY_TURNS);
  const history: ChatTurn[] = historyRows
    .reverse()
    .filter((m) => m.role !== "TOOL")
    .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));
  // a API exige que o histórico comece com o usuário
  while (history.length && history[0].role !== "user") history.shift();

  const cats = await db
    .select({ slug: categories.slug, name: categories.name, group: categories.group })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(categories.sortOrder);
  const system = plannerSystemPrompt({
    today: new Date().toISOString().slice(0, 10),
    categoriesCatalog: cats.map((c) => `${c.slug} — ${c.name} (${c.group})`).join("\n"),
    eventState: JSON.stringify(await eventSnapshot(eventId), null, 1),
    planState: await planStateText(eventId),
  });

  const ui: UiPayload = {};
  await db.insert(aiMessages).values({ conversationId: conv.id, role: "USER", content: input.message });

  let result;
  try {
    result = await engine.run({ system, history, userMessage: input.message, ctx: { eventId }, ui });
  } catch (e) {
    console.error("[ai] falha no motor", engine.id, (e as Error).message);
    result = {
      text: "Tive um problema técnico para processar sua mensagem agora. Pode tentar de novo em instantes? Seu planejamento continua salvo.",
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: [],
    };
  }

  const cost = costMicroUsd(engine.model, result.inputTokens, result.outputTokens);
  if (result.toolCalls.length)
    await db.insert(aiMessages).values(
      result.toolCalls.map((t) => ({
        conversationId: conv!.id,
        role: "TOOL" as const,
        toolName: t.name,
        content: JSON.stringify(t.input).slice(0, 4000),
        payload: t.result as never,
      })),
    );
  await db.insert(aiMessages).values({
    conversationId: conv.id,
    role: "ASSISTANT",
    content: result.text,
    payload: ui as never,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
  await db
    .update(aiConversations)
    .set({
      inputTokens: sql`${aiConversations.inputTokens} + ${result.inputTokens}`,
      outputTokens: sql`${aiConversations.outputTokens} + ${result.outputTokens}`,
      costMicroUsd: sql`${aiConversations.costMicroUsd} + ${cost}`,
    })
    .where(eq(aiConversations.id, conv.id));

  return {
    conversationId: conv.id,
    eventId,
    reply: result.text,
    engine: engine.id,
    ui,
    event: await eventSnapshot(eventId),
    plan: await serializePlan(eventId),
  };
}

export async function serializePlan(eventId: string) {
  const p = await latestPlan(eventId);
  if (!p) return null;
  return {
    version: p.version,
    summary: p.summary,
    savingsTips: p.savingsTips,
    warnings: p.warnings,
    items: p.items.map((i) => ({
      id: i.id,
      slug: i.category.slug,
      name: i.category.name,
      icon: i.category.icon,
      priority: i.priority,
      estMin: i.estMin,
      estMax: i.estMax,
      allocated: i.allocated,
      rationale: i.rationale,
      included: i.included,
    })),
  };
}

/** Carrega uma conversa existente para reabrir o chat. */
export async function loadConversation(conversationId: string, userId: string | null, anonKey: string | null) {
  const conv = await db.query.aiConversations.findFirst({
    where: and(
      eq(aiConversations.id, conversationId),
      userId ? eq(aiConversations.userId, userId) : eq(aiConversations.anonymousKey, anonKey ?? "__none__"),
    ),
    with: { messages: { orderBy: (m, { asc }) => [asc(m.createdAt)] } },
  });
  if (!conv || !conv.eventId) return null;
  return {
    conversationId: conv.id,
    eventId: conv.eventId,
    messages: conv.messages
      .filter((m) => m.role !== "TOOL")
      .map((m) => ({ id: m.id, role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content, ui: (m.payload ?? null) as UiPayload | null })),
    event: await eventSnapshot(conv.eventId),
    plan: await serializePlan(conv.eventId),
  };
}

/** Ao fazer login/cadastro, transfere eventos e conversas anônimas para o usuário. */
export async function claimAnonymous(userId: string, anonKey: string | null) {
  if (!anonKey) return;
  await db.update(events).set({ ownerId: userId, anonymousKey: null }).where(and(eq(events.anonymousKey, anonKey), isNull(events.ownerId)));
  await db.update(aiConversations).set({ userId, anonymousKey: null }).where(and(eq(aiConversations.anonymousKey, anonKey), isNull(aiConversations.userId)));
}
