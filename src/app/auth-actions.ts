"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { claimAnonymous } from "@/server/ai/agent";
import { audit, clientIp, createSession, getAnonKey, hashPassword, verifyPassword } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string } | undefined;

/** Evita open redirect: só caminhos internos. */
function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email("E-mail inválido"), password: z.string().min(1, "Informe a senha") });

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ip = await clientIp();
  const rl = rateLimit(`login:${ip}:${parsed.data.email}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!rl.ok) return { error: `Muitas tentativas. Tente de novo em ${Math.ceil(rl.retryAfterSec / 60)} minutos.` };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  // mesma mensagem para e-mail inexistente e senha errada (não revela contas)
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return { error: "E-mail ou senha incorretos." };
  if (user.status !== "ACTIVE") return { error: "Esta conta está suspensa. Fale com o suporte." };

  await createSession(user.id);
  await claimAnonymous(user.id, await getAnonKey(false));
  await audit(user.id, "auth.login", "user", user.id);
  const fallback = user.role === "ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/fornecedor" : "/painel";
  redirect(safeNext(fd.get("next"), fallback));
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128),
  consent: z.literal("on", { message: "É preciso aceitar os termos e a política de privacidade" }),
  marketing: z.string().optional(),
});

export async function signupAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const rl = rateLimit(`signup:${await clientIp()}`, LIMITS.signup.limit, LIMITS.signup.windowMs);
  if (!rl.ok) return { error: "Muitos cadastros a partir desta conexão. Tente mais tarde." };
  const exists = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email), columns: { id: true } });
  if (exists) return { fieldErrors: { email: "Já existe uma conta com este e-mail. Entre com sua senha." } };

  const [u] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "CONSUMER",
      lgpdConsentAt: new Date(),
      marketingConsent: parsed.data.marketing === "on",
    })
    .returning();
  await createSession(u.id);
  await claimAnonymous(u.id, await getAnonKey(false));
  await audit(u.id, "auth.signup", "user", u.id);
  redirect(safeNext(fd.get("next"), "/painel"));
}
