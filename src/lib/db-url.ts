/**
 * Normaliza a connection string do Postgres para o driver postgres.js.
 * Remove parâmetros que o driver não aceita (ex.: `channel_binding`, incluído pelo Neon).
 * A criptografia continua garantida por `sslmode=require`.
 */
export function normalizeDbUrl(raw: string | undefined): string {
  if (!raw) throw new Error("DATABASE_URL não configurada");
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  try {
    const u = new URL(trimmed);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return trimmed.replace(/([?&])channel_binding=[^&]*(&|$)/, (_m, p1, p2) => (p2 ? p1 : "")).replace(/[?&]$/, "");
  }
}
