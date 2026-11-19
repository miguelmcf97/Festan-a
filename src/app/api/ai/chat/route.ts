import { NextResponse } from "next/server";
import { z } from "zod";
import { chat } from "@/server/ai/agent";
import { clientIp, getAnonKey, getCurrentUser } from "@/server/auth";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";

const body = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().max(64).nullish(),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });

  const user = await getCurrentUser();
  const anonKey = user ? null : await getAnonKey(true);
  const key = `ai:${user?.id ?? anonKey ?? (await clientIp())}`;
  const rl = rateLimit(key, LIMITS.aiChat.limit, LIMITS.aiChat.windowMs);
  const ipRl = rateLimit(`ai-ip:${await clientIp()}`, LIMITS.aiChat.limit * 3, LIMITS.aiChat.windowMs);
  if (!rl.ok || !ipRl.ok) {
    return NextResponse.json(
      { error: `Você atingiu o limite de mensagens por hora. Tente novamente em ${Math.ceil(Math.max(rl.retryAfterSec, ipRl.retryAfterSec) / 60)} min.` },
      { status: 429 },
    );
  }

  const out = await chat({ message: parsed.data.message, conversationId: parsed.data.conversationId, userId: user?.id ?? null, anonKey });
  return NextResponse.json(out);
}
