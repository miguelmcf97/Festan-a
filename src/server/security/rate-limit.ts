/**
 * Rate limiting em memória (janela deslizante simples).
 * Adequado para 1 instância na VPS. Ao escalar horizontalmente, trocar por Redis
 * (mesma interface) — ver docs/ARQUITETURA_TECNICA.md.
 */
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  // limpeza oportunista
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  aiChat: { limit: 30, windowMs: 60 * 60_000 }, // mensagens/hora por usuário ou visitante
  quoteRequest: { limit: 20, windowMs: 24 * 60 * 60_000 },
} as const;
