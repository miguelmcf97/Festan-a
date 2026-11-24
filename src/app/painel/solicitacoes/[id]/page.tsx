import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookingStatus, Flash, QuoteStatus } from "@/components/status";
import { Button, DemoBadge, Input, Panel, Select, Textarea } from "@/components/ui";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { categoryName } from "@/lib/i18n";
import { getT } from "@/server/i18n";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { quoteRequests } from "@/server/db/schema";
import { acceptProposalAction, cancelQuoteAction, complaintAction, consumerMessageAction, rejectProposalAction, reviewAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Solicitação de orçamento", "Quote request") };
}

export default async function QuoteDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const user = await requireUser(["CONSUMER"], `/painel/solicitacoes/${id}`);
  const { lang, t } = await getT();
  const q = await db.query.quoteRequests.findFirst({
    where: and(eq(quoteRequests.id, id), eq(quoteRequests.consumerId, user.id)),
    with: {
      provider: { columns: { tradeName: true, slug: true, isDemo: true, whatsapp: true, phone: true, email: true } },
      category: true,
      event: { with: { location: true } },
      messages: { with: { author: { columns: { name: true } } }, orderBy: (m, { asc }) => [asc(m.createdAt)] },
      proposals: { with: { booking: { with: { review: true } } }, orderBy: (p, { desc }) => [desc(p.createdAt)] },
    },
  });
  if (!q) notFound();
  const sp = await searchParams;
  const booking = q.proposals.find((p) => p.booking)?.booking ?? null;
  const closed = ["COMPLETED", "CANCELLED", "DECLINED"].includes(q.status);
  // Contato direto liberado somente após contratação confirmada
  const showContact = booking && (booking.status === "CONFIRMED" || booking.status === "COMPLETED");
  const canCancel = ["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED", "PROPOSAL_ACCEPTED", "BOOKED"].includes(q.status);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <Link href="/painel" className="text-sm font-semibold text-ink-soft hover:text-ink">← {t("Minhas festas", "My parties")}</Link>
      <div className="mt-3"><Flash {...sp} /></div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{categoryName(q.category, lang)} · {q.event.title}</p>
          <h1 className="text-3xl font-bold">
            <Link href={`/fornecedores/${q.provider.slug}`} className="hover:underline">{q.provider.tradeName}</Link>
          </h1>
          <div className="mt-2 flex flex-wrap gap-2"><QuoteStatus status={q.status} />{booking && <BookingStatus status={booking.status} />}{q.provider.isDemo && <DemoBadge />}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          {q.proposals.length > 0 && (
            <Panel>
              <h2 className="text-xl font-bold">{t("Propostas", "Proposals")}</h2>
              <ul className="mt-3 space-y-4">
                {q.proposals.map((p) => (
                  <li key={p.id} className={`rounded-xl border p-4 ${p.status === "SENT" ? "border-ink" : "border-line opacity-80"}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-display text-2xl font-bold">{formatBRL(p.amount)}</p>
                      <span className="text-xs text-ink-soft">
                        {p.status === "SENT" ? `${t("válida até", "valid until")} ${formatDate(p.validUntil, lang)}` : { ACCEPTED: t("Aceita", "Accepted"), REJECTED: t("Recusada", "Declined"), EXPIRED: t("Expirada", "Expired"), WITHDRAWN: t("Substituída por nova proposta", "Replaced by a new proposal") }[p.status]}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line">{p.description}</p>
                    {p.includes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{p.includes.map((i) => <li key={i}>{i}</li>)}</ul>}
                    {p.conditions && <p className="mt-2 text-sm text-ink-soft"><strong>{t("Condições", "Terms")}:</strong> {p.conditions}</p>}
                    {p.status === "SENT" && q.status === "QUOTED" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <form action={acceptProposalAction}>
                          <input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="proposalId" value={p.id} />
                          <Button size="sm">{t("Aceitar proposta", "Accept proposal")}</Button>
                        </form>
                        <form action={rejectProposalAction}>
                          <input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="proposalId" value={p.id} />
                          <Button size="sm" variant="outline">{t("Recusar", "Decline")}</Button>
                        </form>
                      </div>
                    )}
                    {p.status === "SENT" && q.status === "QUOTED" && (
                      <p className="mt-2 text-xs text-ink-soft">{t("Ao aceitar, a data fica reservada e o fornecedor confirma a contratação. Pagamentos são combinados diretamente com o fornecedor nesta versão.", "When you accept, the date is reserved and the vendor confirms the booking. In this version, payment is arranged directly with the vendor.")}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {booking?.status === "PENDING_CONFIRMATION" && (
            <p className="rounded-xl bg-maracuja-soft p-4 text-sm text-[#6b4800]">{t("Você aceitou a proposta. A contratação ainda", "You accepted the proposal. The booking is")} <strong>{t("não está confirmada", "not confirmed yet")}</strong>: {t("aguardando o fornecedor confirmar.", "waiting for the vendor to confirm.")}</p>
          )}

          {booking?.status === "COMPLETED" && !booking.review && (
            <Panel>
              <h2 className="text-xl font-bold">{t("Avalie", "Review")} {q.provider.tradeName}</h2>
              <form action={reviewAction} className="mt-3 space-y-3">
                <input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="bookingId" value={booking.id} />
                <label className="block text-sm font-semibold" htmlFor="rv-r">{t("Nota", "Rating")}</label>
                <Select id="rv-r" name="rating" defaultValue="5" className="max-w-40">
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? t("estrela", "star") : t("estrelas", "stars")}</option>)}
                </Select>
                <label className="block text-sm font-semibold" htmlFor="rv-c">{t("Como foi?", "How was it?")}</label>
                <Textarea id="rv-c" name="comment" required minLength={10} />
                <Button>{t("Enviar avaliação", "Send review")}</Button>
              </form>
            </Panel>
          )}
          {booking?.review && <p className="rounded-xl bg-surface p-4 text-sm">{t("Sua avaliação", "Your review")} ({booking.review.rating}★) {booking.review.status === "PUBLISHED" ? t("está publicada", "is published") : booking.review.status === "PENDING" ? t("está em moderação", "is being moderated") : t("não foi aprovada", "was not approved")}.</p>}

          <Panel>
            <h2 className="text-xl font-bold">{t("Conversa", "Conversation")}</h2>
            <ol className="mt-3 space-y-3">
              <li className="rounded-xl bg-surface p-3 text-sm">
                <p className="text-xs text-ink-soft">{t("Sua solicitação", "Your request")} · {formatDateTime(q.createdAt, lang)}</p>
                <p className="mt-1 whitespace-pre-line">{q.description}</p>
                {q.budget != null && <p className="mt-1 text-ink-soft">{t("Verba informada", "Stated budget")}: {formatBRL(q.budget)}</p>}
              </li>
              {q.messages.map((m) => (
                <li key={m.id} className={`rounded-xl p-3 text-sm ${m.kind === "INFO_REQUEST" ? "bg-maracuja-soft" : "bg-surface"}`}>
                  <p className="text-xs text-ink-soft">{m.kind === "INFO_REQUEST" ? `${t("Pedido de informação", "Information request")} · ` : ""}{m.author?.name ?? t("Sistema", "System")} · {formatDateTime(m.createdAt, lang)}</p>
                  <p className="mt-1 whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>
            {!closed && (
              <form action={consumerMessageAction} className="mt-4 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="msg" className="sr-only">{t("Mensagem", "Message")}</label>
                <Textarea id="msg" name="body" placeholder={q.status === "AWAITING_INFO" ? t("Responda o que o fornecedor perguntou…", "Answer the vendor’s question…") : t("Escreva uma mensagem…", "Write a message…")} required />
                <Button size="sm" variant="dark">{t("Enviar mensagem", "Send message")}</Button>
              </form>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <h2 className="font-bold">{t("Evento", "Event")}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div><dt className="inline text-ink-soft">{t("Data", "Date")}: </dt><dd className="inline">{formatDate(q.event.date, lang)}</dd></div>
              <div><dt className="inline text-ink-soft">{t("Local", "Location")}: </dt><dd className="inline">{q.event.location ? `${q.event.location.name}, ${q.event.location.city}` : t("a definir", "to be defined")}</dd></div>
              <div><dt className="inline text-ink-soft">{t("Convidados", "Guests")}: </dt><dd className="inline">{q.event.guests ?? "—"}</dd></div>
            </dl>
          </Panel>
          {showContact && (
            <Panel>
              <h2 className="font-bold">{t("Contato do fornecedor", "Vendor contact")}</h2>
              <p className="mt-2 text-sm">{q.provider.whatsapp ?? q.provider.phone}<br />{q.provider.email}</p>
            </Panel>
          )}
          {canCancel && (
            <Panel>
              <h2 className="font-bold">{t("Cancelar solicitação", "Cancel request")}</h2>
              <form action={cancelQuoteAction} className="mt-2 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="reason" className="sr-only">{t("Motivo", "Reason")}</label>
                <Input id="reason" name="reason" placeholder={t("Motivo (opcional)", "Reason (optional)")} />
                <Button size="sm" variant="outline" className="w-full">{t("Cancelar solicitação", "Cancel request")}</Button>
              </form>
            </Panel>
          )}
          <details className="rounded-2xl border border-line p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{t("Relatar um problema", "Report a problem")}</summary>
            <form action={complaintAction} className="mt-3 space-y-2">
              <input type="hidden" name="quoteId" value={q.id} />
              <label htmlFor="cs" className="sr-only">{t("Assunto", "Subject")}</label>
              <Input id="cs" name="subject" placeholder={t("Assunto", "Subject")} required />
              <label htmlFor="cb" className="sr-only">{t("Descrição", "Description")}</label>
              <Textarea id="cb" name="body" placeholder={t("O que aconteceu?", "What happened?")} required />
              <Button size="sm" variant="outline" className="w-full">{t("Enviar para a Planfest", "Send to Planfest")}</Button>
            </form>
          </details>
        </aside>
      </div>
    </div>
  );
}
