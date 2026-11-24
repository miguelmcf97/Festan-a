import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { aiConversations, aiMessages, categories, events } from "../db/schema";
import { latestPlan } from "../services/planning";
import { costMicroUsd, getEngine, type ChatTurn, type EngineEvents, type EngineResult } from "./engines";
import { getActiveCategories } from "../services/catalog-cache";
import { PROMPT_VERSION, plannerSystemPrompt } from "./prompts";
import { eventSnapshot, planStateText, type UiPayload } from "./tools";
import type { AiUsage } from "../services/ai-usage";
import { makeT, type Lang } from "@/lib/i18n";

const HISTORY_TURNS = 12; // controla custo: o estado do evento vai estruturado no system prompt

export type ChatOutput = {
  conversationId: string;
  eventId: string;
  reply: string;
  engine: string;
  ui: UiPayload;
  event: Awaited<ReturnType<typeof eventSnapshot>>;
  plan: Awaited<ReturnType<typeof serializePlan>>;
  timings?: Record<string, number>;
  usage?: AiUsage;
};

export async function chat(input: {
  message: string;
  conversationId?: string | null;
  userId: string | null;
  anonKey: string | null;
  events?: EngineEvents;
  lang?: Lang;
  usage?: AiUsage; // uso ANTES desta mensagem (a rota já conferiu que há saldo)
}): Promise<ChatOutput> {
  const tStart = Date.now();
  const lang = input.lang ?? "pt";
  const t = makeT(lang);
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
      .values({ title: t("Novo evento", "New event"), ownerId: input.userId, anonymousKey: input.userId ? null : input.anonKey })
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
  const convId = conv.id;

  // Consultas independentes em paralelo (cada ida ao banco pode custar ~100 ms entre regiões)
  const [historyRows, cats, snapshot, planState, [userMsg]] = await Promise.all([
    db
      .select({ role: aiMessages.role, content: aiMessages.content })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, convId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(HISTORY_TURNS),
    getActiveCategories(),
    eventSnapshot(eventId),
    planStateText(eventId),
    db.insert(aiMessages).values({ conversationId: convId, role: "USER", content: input.message }).returning({ id: aiMessages.id }),
  ]);
  const history: ChatTurn[] = historyRows
    .reverse()
    .filter((m) => m.role !== "TOOL")
    .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));
  // a API exige que o histórico comece com o usuário
  while (history.length && history[0].role !== "user") history.shift();

  const system = plannerSystemPrompt({
    today: new Date().toISOString().slice(0, 10),
    categoriesCatalog: cats.map((c) => `${c.slug} — ${c.name} (${c.group})`).join("\n"),
    eventState: JSON.stringify(snapshot, null, 1),
    planState,
    lang,
    messagesLeft: input.usage?.remaining == null ? null : Math.max(0, input.usage.remaining - 1),
  });
  const tPrep = Date.now();

  const ui: UiPayload = {};
  let result: EngineResult;
  let engineOk = false;
  try {
    result = await engine.run({ system, history, userMessage: input.message, ctx: { eventId, lang }, ui, events: input.events });
    engineOk = true;
  } catch (e) {
    console.error("[ai] falha no motor", engine.id, (e as Error).message);
    input.events?.onReset?.();
    // mensagem que falhou não conta no limite do cliente
    await db.delete(aiMessages).where(eq(aiMessages.id, userMsg.id));
    result = {
      text: t(
        "Tive um problema técnico para processar sua mensagem agora. Pode tentar de novo em instantes? Seu planejamento continua salvo e esta mensagem não foi descontada.",
        "I ran into a technical problem processing your message. Could you try again in a moment? Your plan is still saved and this message was not counted.",
      ),
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: [],
    };
  }
  const tEngine = Date.now();

  const cost = costMicroUsd(engine.model, result.inputTokens, result.outputTokens);
  const [, , eventOut, planOut] = await Promise.all([
    db.insert(aiMessages).values([
      ...result.toolCalls.map((t) => ({
        conversationId: convId,
        role: "TOOL" as const,
        toolName: t.name,
        content: JSON.stringify(t.input).slice(0, 4000),
        payload: t.result as never,
      })),
      {
        conversationId: convId,
        role: "ASSISTANT" as const,
        content: result.text,
        payload: ui as never,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    ]),
    db
      .update(aiConversations)
      .set({
        inputTokens: sql`${aiConversations.inputTokens} + ${result.inputTokens}`,
        outputTokens: sql`${aiConversations.outputTokens} + ${result.outputTokens}`,
        costMicroUsd: sql`${aiConversations.costMicroUsd} + ${cost}`,
      })
      .where(eq(aiConversations.id, convId)),
    eventSnapshot(eventId),
    serializePlan(eventId),
  ]);

  const timings = {
    totalMs: Date.now() - tStart,
    prepMs: tPrep - tStart,
    engineMs: tEngine - tPrep,
    saveMs: Date.now() - tEngine,
    ...(result.timings ?? {}),
  };
  console.info(JSON.stringify({ tag: "ai.timing", engine: engine.id, model: engine.model, prompt: PROMPT_VERSION, conv: convId, ...timings }));

  return {
    conversationId: convId,
    eventId,
    reply: result.text,
    engine: engine.id,
    ui,
    event: eventOut,
    plan: planOut,
    timings,
    usage: input.usage
      ? input.usage.limit == null
        ? input.usage
        : { limit: input.usage.limit, used: input.usage.used + (engineOk ? 1 : 0), remaining: Math.max(0, (input.usage.remaining ?? 0) - (engineOk ? 1 : 0)) }
      : undefined,
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
