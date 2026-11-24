"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { eventTypeLabel, formatBRL, formatDate } from "@/lib/format";
import { getT } from "@/server/i18n";
import { audit, getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { events, locations } from "@/server/db/schema";
import { BusinessRuleError, createQuoteRequests } from "@/server/services/quotes";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";

const schema = z.object({
  eventId: z.string().min(1),
  items: z.array(z.object({ providerId: z.string(), categoryId: z.string().optional(), categorySlug: z.string(), budget: z.number().int().nullable() })).min(1).max(15),
  description: z.string().trim().min(10, "Descreva rapidamente o que você precisa").max(2000),
});

export type QuoteActionResult = { ok: true; created: number; skipped: number } | { ok: false; error: string; needsLogin?: boolean };

export async function requestQuotesAction(input: z.infer<typeof schema>): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  const { t } = await getT();
  if (!user) return { ok: false, error: t("Entre ou crie sua conta para enviar solicitações.", "Sign in or create an account to send requests."), needsLogin: true };
  if (user.role !== "CONSUMER") return { ok: false, error: t("Somente contas de cliente podem pedir orçamentos.", "Only customer accounts can request quotes.") };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t(parsed.error.issues[0]?.message ?? "Dados inválidos", "Describe briefly what you need (at least 10 characters).") };
  const rl = rateLimit(`quote:${user.id}`, LIMITS.quoteRequest.limit, LIMITS.quoteRequest.windowMs);
  if (!rl.ok) return { ok: false, error: t("Limite diário de solicitações atingido. Tente amanhã.", "Daily request limit reached. Try again tomorrow.") };

  const cats = await db.query.categories.findMany();
  const bySlug = new Map(cats.map((c) => [c.slug, c.id]));
  try {
    // agrupa por verba: cada item pode ter a verba da sua categoria
    let created = 0, skipped = 0;
    for (const it of parsed.data.items) {
      const categoryId = it.categoryId ?? bySlug.get(it.categorySlug);
      if (!categoryId) { skipped++; continue; }
      const r = await createQuoteRequests({ consumerId: user.id, eventId: parsed.data.eventId, items: [{ providerId: it.providerId, categoryId }], description: parsed.data.description, budget: it.budget, viaAi: true });
      created += r.created.length;
      skipped += r.skipped.length;
    }
    await audit(user.id, "quote.create", "event", parsed.data.eventId, { created, skipped });
    return { ok: true, created, skipped };
  } catch (e) {
    if (e instanceof BusinessRuleError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Texto inicial da solicitação, montado a partir dos dados do evento. */
export async function eventBriefAction(eventId: string): Promise<string> {
  const user = await getCurrentUser();
  const { lang, t } = await getT();
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!ev || (ev.ownerId && ev.ownerId !== user?.id)) return "";
  const loc = ev.locationId ? await db.query.locations.findFirst({ where: eq(locations.id, ev.locationId) }) : null;
  const prefs = Object.entries(ev.preferences ?? {})
    .filter(([k]) => !k.startsWith("servicos_"))
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  return [
    `${eventTypeLabel(ev.type, lang)}${ev.guests ? t(` para ${ev.guests} pessoas`, ` for ${ev.guests} people`) : ""}${loc ? t(` em ${loc.name} (${loc.city})`, ` in ${loc.name} (${loc.city})`) : ""}.`,
    `${t("Data", "Date")}: ${ev.date ? formatDate(ev.date, lang) : t("a definir", "to be defined")}.`,
    ev.budgetTotal ? `${t("Orçamento total da festa", "Total party budget")}: ${formatBRL(ev.budgetTotal)}.` : "",
    prefs.length ? `${t("Preferências", "Preferences")}: ${prefs.join("; ")}.` : "",
  ].filter(Boolean).join(" ");
}
