import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { aiConversations, aiMessages, platformSettings } from "../db/schema";

export const AI_LIMIT_KEY = "ai_message_limit";

/** Quantas mensagens cada cliente pode enviar à IA (contando todas as conversas). Padrão: 3. */
export async function getAiMessageLimit(): Promise<number> {
  const row = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, AI_LIMIT_KEY) });
  const v = (row?.value as { limit?: number } | undefined)?.limit;
  if (typeof v === "number" && v >= 0) return v;
  const env = Number(process.env.AI_MESSAGE_LIMIT);
  return Number.isFinite(env) && env >= 0 ? env : 3;
}

export type AiUsage = { used: number; limit: number | null; remaining: number | null };

/**
 * Uso da IA por quem pede: conta as mensagens enviadas pela pessoa (usuário logado ou visitante).
 * Administradores não têm limite (precisam testar). Ao entrar na conta, as conversas de visitante
 * passam para o usuário, então o uso anterior continua contando.
 */
export async function getAiUsage(who: { userId: string | null; anonKey: string | null; role?: string | null }): Promise<AiUsage> {
  if (who.role === "ADMIN") return { used: 0, limit: null, remaining: null };
  const owner = who.userId
    ? eq(aiConversations.userId, who.userId)
    : who.anonKey
      ? eq(aiConversations.anonymousKey, who.anonKey)
      : null;
  const [limit, used] = await Promise.all([
    getAiMessageLimit(),
    owner
      ? db
          .select({ n: count() })
          .from(aiMessages)
          .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
          .where(and(owner, eq(aiMessages.role, "USER")))
          .then((r) => r[0]?.n ?? 0)
      : Promise.resolve(0),
  ]);
  return { used, limit, remaining: Math.max(0, limit - used) };
}
