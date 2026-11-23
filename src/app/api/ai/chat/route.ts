import { NextResponse } from "next/server";
import { z } from "zod";
import { chat } from "@/server/ai/agent";
import { clientIp, getAnonKey, getCurrentUser } from "@/server/auth";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";

export const maxDuration = 60; // segundos (limite do provedor de hospedagem pode ser menor)

const body = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().max(64).nullish(),
});

/**
 * POST /api/ai/chat
 * - Accept: application/x-ndjson → transmite eventos linha a linha:
 *     {"type":"status","text":"…"} · {"type":"text","delta":"…"} · {"type":"reset"} · {"type":"done","data":ChatOutput} · {"type":"error","error":"…"}
 * - Caso contrário → JSON único (compatibilidade e testes).
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });

  const user = await getCurrentUser();
  const anonKey = user ? null : await getAnonKey(true);
  const ip = await clientIp();
  const rl = rateLimit(`ai:${user?.id ?? anonKey ?? ip}`, LIMITS.aiChat.limit, LIMITS.aiChat.windowMs);
  const ipRl = rateLimit(`ai-ip:${ip}`, LIMITS.aiChat.limit * 3, LIMITS.aiChat.windowMs);
  if (!rl.ok || !ipRl.ok) {
    return NextResponse.json(
      { error: `Você atingiu o limite de mensagens por hora. Tente novamente em ${Math.ceil(Math.max(rl.retryAfterSec, ipRl.retryAfterSec) / 60)} min.` },
      { status: 429 },
    );
  }
  const args = { message: parsed.data.message, conversationId: parsed.data.conversationId, userId: user?.id ?? null, anonKey };

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
            onStatus: (text) => send({ type: "status", text }),
            onText: (delta) => send({ type: "text", delta }),
            onReset: () => send({ type: "reset" }),
          },
        });
        send({ type: "done", data });
      } catch (e) {
        console.error("[ai] erro no chat", (e as Error).message);
        send({ type: "error", error: "Não foi possível processar sua mensagem. Tente de novo em instantes." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
