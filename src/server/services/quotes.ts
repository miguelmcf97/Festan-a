import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import {
  availability,
  bookings,
  events,
  notifications,
  proposals,
  providers,
  quoteMessages,
  quoteRequests,
  reviews,
} from "../db/schema";

export { assertTransition, BusinessRuleError, QUOTE_TRANSITIONS, type QuoteStatus } from "@/lib/quote-rules";
import { assertTransition, BusinessRuleError, type QuoteStatus } from "@/lib/quote-rules";

export async function notify(userId: string, type: string, title: string, body: string, link?: string) {
  await db.insert(notifications).values({ userId, type, title, body, link });
  // Futuro: e-mail/WhatsApp via fila (ver ARQUITETURA_TECNICA.md §Notificações)
}

async function getQuoteForProvider(quoteId: string, ownerUserId: string) {
  const q = await db.query.quoteRequests.findFirst({ where: eq(quoteRequests.id, quoteId), with: { provider: true, event: true } });
  if (!q || q.provider.ownerId !== ownerUserId) throw new BusinessRuleError("Solicitação não encontrada");
  return q;
}
async function getQuoteForConsumer(quoteId: string, consumerId: string) {
  const q = await db.query.quoteRequests.findFirst({ where: eq(quoteRequests.id, quoteId), with: { provider: true, event: true } });
  if (!q || q.consumerId !== consumerId) throw new BusinessRuleError("Solicitação não encontrada");
  return q;
}

async function touchResponse(q: { id: string; firstResponseAt: Date | null }) {
  if (!q.firstResponseAt) await db.update(quoteRequests).set({ firstResponseAt: new Date() }).where(eq(quoteRequests.id, q.id));
}

// ───────────── Consumidor ─────────────

export async function createQuoteRequests(input: {
  consumerId: string;
  eventId: string;
  items: { providerId: string; categoryId: string }[];
  description: string;
  budget: number | null;
  viaAi: boolean;
}) {
  const ev = await db.query.events.findFirst({ where: eq(events.id, input.eventId) });
  if (!ev || ev.ownerId !== input.consumerId) throw new BusinessRuleError("Evento não encontrado");
  const provs = await db.query.providers.findMany({ where: and(inArray(providers.id, input.items.map((i) => i.providerId)), eq(providers.status, "APPROVED")) });
  const created: string[] = [];
  const skipped: string[] = [];
  for (const it of input.items) {
    const prov = provs.find((p) => p.id === it.providerId);
    if (!prov) { skipped.push(it.providerId); continue; }
    const rows = await db
      .insert(quoteRequests)
      .values({ eventId: ev.id, consumerId: input.consumerId, providerId: prov.id, categoryId: it.categoryId, description: input.description, budget: input.budget, viaAi: input.viaAi })
      .onConflictDoNothing()
      .returning({ id: quoteRequests.id });
    if (!rows.length) { skipped.push(prov.tradeName); continue; }
    created.push(rows[0].id);
    await notify(prov.ownerId, "QUOTE_NEW", "Nova solicitação de orçamento", `${ev.title}${ev.guests ? ` · ${ev.guests} convidados` : ""}`, `/fornecedor/oportunidades/${rows[0].id}`);
  }
  if (created.length && ev.status === "PLANNING") await db.update(events).set({ status: "REQUESTING" }).where(eq(events.id, ev.id));
  return { created, skipped };
}

export async function consumerMessage(quoteId: string, consumerId: string, body: string) {
  const q = await getQuoteForConsumer(quoteId, consumerId);
  if (["COMPLETED", "CANCELLED", "DECLINED"].includes(q.status)) throw new BusinessRuleError("Esta solicitação está encerrada");
  await db.insert(quoteMessages).values({ quoteRequestId: q.id, authorId: consumerId, body });
  if (q.status === "AWAITING_INFO") await db.update(quoteRequests).set({ status: "IN_REVIEW" }).where(eq(quoteRequests.id, q.id));
  await notify(q.provider.ownerId, "QUOTE_MESSAGE", "Nova mensagem do cliente", body.slice(0, 120), `/fornecedor/oportunidades/${q.id}`);
}

/** Aceitar proposta cria uma RESERVA (booking PENDING_CONFIRMATION). Não é contratação confirmada. */
export async function acceptProposal(proposalId: string, consumerId: string) {
  const p = await db.query.proposals.findFirst({ where: eq(proposals.id, proposalId), with: { quoteRequest: { with: { provider: true } } } });
  if (!p || p.quoteRequest.consumerId !== consumerId) throw new BusinessRuleError("Proposta não encontrada");
  if (p.status !== "SENT") throw new BusinessRuleError("Esta proposta não está mais disponível");
  if (p.validUntil < new Date().toISOString().slice(0, 10)) {
    await db.update(proposals).set({ status: "EXPIRED" }).where(eq(proposals.id, p.id));
    throw new BusinessRuleError("Proposta expirada — peça ao fornecedor uma nova");
  }
  assertTransition(p.quoteRequest.status as QuoteStatus, "PROPOSAL_ACCEPTED");
  await db.transaction(async (tx) => {
    await tx.update(proposals).set({ status: "ACCEPTED" }).where(eq(proposals.id, p.id));
    await tx.update(proposals).set({ status: "REJECTED" }).where(and(eq(proposals.quoteRequestId, p.quoteRequestId), ne(proposals.id, p.id), eq(proposals.status, "SENT")));
    await tx.update(quoteRequests).set({ status: "PROPOSAL_ACCEPTED" }).where(eq(quoteRequests.id, p.quoteRequestId));
    await tx.insert(bookings).values({ proposalId: p.id, eventId: p.quoteRequest.eventId, consumerId, providerId: p.quoteRequest.providerId, amount: p.amount });
    await tx.update(events).set({ status: "CONTRACTING" }).where(eq(events.id, p.quoteRequest.eventId));
  });
  await notify(p.quoteRequest.provider.ownerId, "PROPOSAL_ACCEPTED", "Proposta aceita — confirme a contratação", "O cliente aceitou sua proposta. Confirme para fechar a contratação.", `/fornecedor/oportunidades/${p.quoteRequestId}`);
}

export async function rejectProposal(proposalId: string, consumerId: string) {
  const p = await db.query.proposals.findFirst({ where: eq(proposals.id, proposalId), with: { quoteRequest: { with: { provider: true } } } });
  if (!p || p.quoteRequest.consumerId !== consumerId || p.status !== "SENT") throw new BusinessRuleError("Proposta não encontrada");
  await db.update(proposals).set({ status: "REJECTED" }).where(eq(proposals.id, p.id));
  await notify(p.quoteRequest.provider.ownerId, "PROPOSAL_REJECTED", "Proposta recusada", "O cliente recusou a proposta enviada.", `/fornecedor/oportunidades/${p.quoteRequestId}`);
}

export async function cancelQuote(quoteId: string, consumerId: string, reason: string) {
  const q = await getQuoteForConsumer(quoteId, consumerId);
  assertTransition(q.status as QuoteStatus, "CANCELLED");
  await db.transaction(async (tx) => {
    await tx.update(quoteRequests).set({ status: "CANCELLED", closedReason: reason }).where(eq(quoteRequests.id, q.id));
    const bk = await tx.select().from(bookings).innerJoin(proposals, eq(proposals.id, bookings.proposalId)).where(eq(proposals.quoteRequestId, q.id));
    for (const b of bk) {
      if (b.bookings.status === "CANCELLED" || b.bookings.status === "COMPLETED") continue;
      await tx.update(bookings).set({ status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason }).where(eq(bookings.id, b.bookings.id));
      if (q.event.date) await tx.delete(availability).where(and(eq(availability.providerId, q.providerId), eq(availability.date, q.event.date), eq(availability.status, "BOOKED")));
    }
  });
  await notify(q.provider.ownerId, "QUOTE_CANCELLED", "Solicitação cancelada pelo cliente", reason || "Sem motivo informado", `/fornecedor/oportunidades/${q.id}`);
}

/** Avaliação só para contratação CONCLUÍDA, uma por contratação, entra como PENDENTE de moderação. */
export async function createReview(bookingId: string, authorId: string, rating: number, comment: string) {
  const b = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId), with: { review: true } });
  if (!b || b.consumerId !== authorId) throw new BusinessRuleError("Contratação não encontrada");
  if (b.status !== "COMPLETED") throw new BusinessRuleError("Só é possível avaliar contratações concluídas");
  if (b.review) throw new BusinessRuleError("Esta contratação já foi avaliada");
  if (rating < 1 || rating > 5) throw new BusinessRuleError("Nota inválida");
  await db.insert(reviews).values({ bookingId, providerId: b.providerId, authorId, rating, comment });
}

// ───────────── Fornecedor ─────────────

export async function providerSetStatus(quoteId: string, ownerUserId: string, to: "IN_REVIEW" | "DECLINED", reason?: string) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  assertTransition(q.status as QuoteStatus, to);
  await db.update(quoteRequests).set({ status: to, closedReason: to === "DECLINED" ? (reason ?? null) : null }).where(eq(quoteRequests.id, q.id));
  await touchResponse(q);
  if (to === "DECLINED") await notify(q.consumerId, "QUOTE_DECLINED", `${q.provider.tradeName} não poderá atender`, reason || "O fornecedor recusou a solicitação.", `/painel/solicitacoes/${q.id}`);
}

export async function providerAskInfo(quoteId: string, ownerUserId: string, body: string) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  assertTransition(q.status as QuoteStatus, "AWAITING_INFO");
  await db.insert(quoteMessages).values({ quoteRequestId: q.id, authorId: ownerUserId, kind: "INFO_REQUEST", body });
  await db.update(quoteRequests).set({ status: "AWAITING_INFO" }).where(eq(quoteRequests.id, q.id));
  await touchResponse(q);
  await notify(q.consumerId, "INFO_REQUEST", `${q.provider.tradeName} pediu mais informações`, body.slice(0, 120), `/painel/solicitacoes/${q.id}`);
}

export async function providerMessage(quoteId: string, ownerUserId: string, body: string) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  if (["COMPLETED", "CANCELLED", "DECLINED"].includes(q.status)) throw new BusinessRuleError("Esta solicitação está encerrada");
  await db.insert(quoteMessages).values({ quoteRequestId: q.id, authorId: ownerUserId, body });
  await touchResponse(q);
  await notify(q.consumerId, "QUOTE_MESSAGE", `Mensagem de ${q.provider.tradeName}`, body.slice(0, 120), `/painel/solicitacoes/${q.id}`);
}

export async function sendProposal(
  quoteId: string,
  ownerUserId: string,
  data: { amount: number; description: string; conditions: string | null; includes: string[]; validUntil: string },
) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  assertTransition(q.status as QuoteStatus, "QUOTED");
  if (data.amount <= 0) throw new BusinessRuleError("Informe um valor válido");
  if (data.validUntil < new Date().toISOString().slice(0, 10)) throw new BusinessRuleError("A validade precisa ser uma data futura");
  await db.transaction(async (tx) => {
    // nova proposta substitui a anterior ainda aberta
    await tx.update(proposals).set({ status: "WITHDRAWN" }).where(and(eq(proposals.quoteRequestId, q.id), eq(proposals.status, "SENT")));
    await tx.insert(proposals).values({ quoteRequestId: q.id, ...data });
    await tx.update(quoteRequests).set({ status: "QUOTED" }).where(eq(quoteRequests.id, q.id));
  });
  await touchResponse(q);
  await notify(q.consumerId, "PROPOSAL_RECEIVED", `Novo orçamento de ${q.provider.tradeName}`, `Valor: R$ ${(data.amount / 100).toLocaleString("pt-BR")}`, `/painel/solicitacoes/${q.id}`);
}

/** Fornecedor confirma a reserva → CONTRATAÇÃO CONFIRMADA e data marcada como ocupada. */
export async function confirmBooking(quoteId: string, ownerUserId: string) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  assertTransition(q.status as QuoteStatus, "BOOKED");
  const bk = await db.select({ id: bookings.id }).from(bookings).innerJoin(proposals, eq(proposals.id, bookings.proposalId)).where(and(eq(proposals.quoteRequestId, q.id), eq(bookings.status, "PENDING_CONFIRMATION")));
  if (!bk.length) throw new BusinessRuleError("Não há reserva pendente");
  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ status: "CONFIRMED", confirmedAt: new Date() }).where(eq(bookings.id, bk[0].id));
    await tx.update(quoteRequests).set({ status: "BOOKED" }).where(eq(quoteRequests.id, q.id));
    if (q.event.date)
      await tx.insert(availability).values({ providerId: q.providerId, date: q.event.date, status: "BOOKED", note: q.event.title }).onConflictDoNothing();
  });
  await notify(q.consumerId, "BOOKING_CONFIRMED", "Contratação confirmada", `${q.provider.tradeName} confirmou a contratação.`, `/painel/solicitacoes/${q.id}`);
}

/** Fornecedor não pode atender após aceite: reserva cancelada, solicitação volta a QUOTED? Não — encerra como DECLINED via cancelamento. */
export async function providerReleaseBooking(quoteId: string, ownerUserId: string, reason: string) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  if (q.status !== "PROPOSAL_ACCEPTED") throw new BusinessRuleError("Só é possível recusar uma reserva pendente");
  await db.transaction(async (tx) => {
    const bk = await tx.select({ id: bookings.id }).from(bookings).innerJoin(proposals, eq(proposals.id, bookings.proposalId)).where(and(eq(proposals.quoteRequestId, q.id), eq(bookings.status, "PENDING_CONFIRMATION")));
    for (const b of bk) await tx.update(bookings).set({ status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason }).where(eq(bookings.id, b.id));
    await tx.update(quoteRequests).set({ status: "CANCELLED", closedReason: `Fornecedor não confirmou: ${reason}` }).where(eq(quoteRequests.id, q.id));
  });
  await notify(q.consumerId, "BOOKING_RELEASED", `${q.provider.tradeName} não confirmou a reserva`, reason, `/painel/solicitacoes/${q.id}`);
}

export async function completeBooking(quoteId: string, ownerUserId: string) {
  const q = await getQuoteForProvider(quoteId, ownerUserId);
  assertTransition(q.status as QuoteStatus, "COMPLETED");
  if (q.event.date && q.event.date > new Date().toISOString().slice(0, 10)) throw new BusinessRuleError("Só é possível concluir após a data do evento");
  await db.transaction(async (tx) => {
    await tx.update(quoteRequests).set({ status: "COMPLETED" }).where(eq(quoteRequests.id, q.id));
    await tx.execute(sql`UPDATE bookings SET status='COMPLETED', completed_at=now() WHERE status='CONFIRMED' AND proposal_id IN (SELECT id FROM proposals WHERE quote_request_id=${q.id})`);
  });
  await notify(q.consumerId, "BOOKING_COMPLETED", "Como foi o serviço?", `Avalie ${q.provider.tradeName} e ajude outras pessoas.`, `/painel/solicitacoes/${q.id}`);
}

/** Recalcula nota média e taxa de resposta do fornecedor. */
export async function refreshProviderMetrics(providerId: string) {
  await db.execute(sql`
    UPDATE providers p SET
      avg_rating = (SELECT AVG(rating)::float FROM reviews WHERE provider_id = ${providerId} AND status='PUBLISHED'),
      review_count = (SELECT COUNT(*)::int FROM reviews WHERE provider_id = ${providerId} AND status='PUBLISHED'),
      response_rate = COALESCE((SELECT AVG(CASE WHEN first_response_at IS NOT NULL THEN 1.0 ELSE 0 END)::float FROM quote_requests WHERE provider_id = ${providerId} AND created_at < now() - interval '48 hours'), p.response_rate)
    WHERE p.id = ${providerId}`);
}
