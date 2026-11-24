import { NextResponse } from "next/server";
import { z } from "zod";
import { chat } from "@/server/ai/agent";
import { clientIp, getAnonKey, getCurrentUser } from "@/server/auth";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";
import { getAiUsage } from "@/server/services/ai-usage";
import { getT } from "@/server/i18n";

export const maxDuration = 60; // segundos (limite do provedor de hospedagem pode ser menor)

const body = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().max(64).nullish(),
});

/**
 * POST /api/ai/chat
 * - Accept: application/x-ndjson → transmite eventos linha a linha:
 *     {"type":"status","code":"reading|tool:<nome>|writing"} · {"type":"text","delta":"…"} · {"type":"reset"} · {"type":"done","data":ChatOutput} · {"type":"error","error":"…"}
 * - Caso contrário → JSON único (compatibilidade e testes).
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  const { lang, t } = await getT();
  if (!parsed.success) return NextResponse.json({ error: t("Mensagem inválida.", "Invalid message.") }, { status: 400 });

  const user = await getCurrentUser();
  const anonKey = user ? null : await getAnonKey(true);
  const ip = await clientIp();
  const rl = rateLimit(`ai:${user?.id ?? anonKey ?? ip}`, LIMITS.aiChat.limit, LIMITS.aiChat.windowMs);
  const ipRl = rateLimit(`ai-ip:${ip}`, LIMITS.aiChat.limit * 3, LIMITS.aiChat.windowMs);
  if (!rl.ok || !ipRl.ok) {
    return NextResponse.json(
      { error: t(`Você atingiu o limite de mensagens por hora. Tente novamente em ${Math.ceil(Math.max(rl.retryAfterSec, ipRl.retryAfterSec) / 60)} min.`, `You reached the hourly message limit. Try again in ${Math.ceil(Math.max(rl.retryAfterSec, ipRl.retryAfterSec) / 60)} min.`) },
      { status: 429 },
    );
  }
  // Limite de mensagens por cliente (redução de custo). A mensagem que falhar não é descontada.
  const usage = await getAiUsage({ userId: user?.id ?? null, anonKey, role: user?.role });
  if (usage.remaining !== null && usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: t(
          `Você já usou as ${usage.limit} mensagens com a assistente. Seu planejamento continua salvo: revise os fornecedores sugeridos e peça orçamentos, ou busque no catálogo.`,
          `You have used all ${usage.limit} messages with the assistant. Your plan is still saved: review the suggested vendors and request quotes, or browse the catalog.`,
        ),
        code: "AI_LIMIT",
        usage,
      },
      { status: 429 },
    );
  }
  const args = { message: parsed.data.message, conversationId: parsed.data.conversationId, userId: user?.id ?? null, anonKey, lang, usage };

  if (!(req.headers.get("accept") ?? "").includes("application/x-ndjson")) {
    return NextResponse.json(await chat(args));
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const data = await chat({
          ...args,
          events: {
            onStatus: (code) => send({ type: "status", code }),
            onText: (delta) => send({ type: "text", delta }),
            onReset: () => send({ type: "reset" }),
          },
        });
        send({ type: "done", data });
      } catch (e) {
        console.error("[ai] erro no chat", (e as Error).message);
        send({ type: "error", error: t("Não foi possível processar sua mensagem. Tente de novo em instantes.", "We could not process your message. Please try again in a moment.") });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
