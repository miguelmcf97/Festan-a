import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { auditLogs, sessions, users } from "./db/schema";

export const SESSION_COOKIE = "pf_session";
export const ANON_COOKIE = "pf_anon";
const SESSION_DAYS = 30;

export type Role = "CONSUMER" | "PROVIDER" | "ADMIN";
export type CurrentUser = { id: string; name: string; email: string; role: Role };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt,
    ip: await clientIp(),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0];
  if (!u || u.status !== "ACTIVE") return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

/** Exige login (e opcionalmente um papel). Redireciona para /entrar se não houver sessão. */
export async function requireUser(roles?: Role[], next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (roles && !roles.includes(user.role)) redirect("/acesso-negado");
  return user;
}

/** Chave anônima para planejar antes de criar conta (cookie httpOnly). */
export async function getAnonKey(create = false): Promise<string | null> {
  const jar = await cookies();
  let key = jar.get(ANON_COOKIE)?.value ?? null;
  if (!key && create) {
    key = randomBytes(18).toString("base64url");
    jar.set(ANON_COOKIE, key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return key;
}

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, meta?: unknown) {
  await db.insert(auditLogs).values({
    actorId,
    action,
    entity,
    entityId: entityId ?? null,
    meta: (meta ?? null) as never,
    ip: await clientIp(),
  });
}
