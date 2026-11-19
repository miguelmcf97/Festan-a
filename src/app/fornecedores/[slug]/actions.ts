"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FormState } from "@/app/auth-actions";
import { EVENT_TYPE_LABEL, reaisToCents } from "@/lib/format";
import { audit, getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { events, providers } from "@/server/db/schema";
import { BusinessRuleError, createQuoteRequests } from "@/server/services/quotes";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";

const schema = z.object({
  providerId: z.string(),
  categoryId: z.string().min(1, "Escolha o serviço"),
  eventId: z.string().optional(),
  type: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  locationId: z.string().optional(),
  guests: z.coerce.number().int().min(1).max(5000).optional(),
  budget: z.string().optional(),
  description: z.string().trim().min(10, "Conte um pouco mais sobre o que você precisa (mín. 10 caracteres)").max(2000),
});

export async function directQuoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta para pedir orçamento." };
  if (user.role !== "CONSUMER") return { error: "Use uma conta de cliente para pedir orçamentos." };
  const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const rl = rateLimit(`quote:${user.id}`, LIMITS.quoteRequest.limit, LIMITS.quoteRequest.windowMs);
  if (!rl.ok) return { error: "Limite diário de solicitações atingido." };

  const prov = await db.query.providers.findFirst({ where: and(eq(providers.id, d.providerId), eq(providers.status, "APPROVED")) });
  if (!prov) return { error: "Fornecedor indisponível." };

  let eventId = d.eventId && d.eventId !== "new" ? d.eventId : null;
  if (!eventId) {
    if (!d.type || !(d.type in EVENT_TYPE_LABEL)) return { error: "Informe o tipo de evento." };
    if (!d.guests) return { error: "Informe o número de convidados." };
    const [ev] = await db
      .insert(events)
      .values({
        ownerId: user.id,
        type: d.type as keyof typeof EVENT_TYPE_LABEL as never,
        title: EVENT_TYPE_LABEL[d.type],
        date: d.date || null,
        dateFlexible: !d.date,
        locationId: d.locationId || null,
        guests: d.guests,
        status: "PLANNING",
      })
      .returning();
    eventId = ev.id;
  }
  try {
    const r = await createQuoteRequests({
      consumerId: user.id,
      eventId,
      items: [{ providerId: prov.id, categoryId: d.categoryId }],
      description: d.description,
      budget: reaisToCents(d.budget ?? null),
      viaAi: false,
    });
    if (!r.created.length) return { error: "Você já tem uma solicitação aberta com este fornecedor para este evento e serviço." };
    await audit(user.id, "quote.create", "provider", prov.id);
    return { ok: true, message: "Solicitação enviada! O fornecedor vai responder pelo seu painel. Isto ainda não é uma reserva." };
  } catch (e) {
    if (e instanceof BusinessRuleError) return { error: e.message };
    throw e;
  }
}
