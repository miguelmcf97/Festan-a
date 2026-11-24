import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookingStatus, Flash, QuoteStatus } from "@/components/status";
import { Button, Field, Input, Panel, Textarea } from "@/components/ui";
import { eventTypeLabel, formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { categoryName } from "@/lib/i18n";
import { getT } from "@/server/i18n";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { quoteRequests } from "@/server/db/schema";
import { myProvider } from "@/server/services/providers";
import {
  askInfoAction, completeAction, confirmBookingAction, declineAction, markReviewAction, providerMessageAction, releaseBookingAction, sendProposalAction,
} from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Oportunidade", "Opportunity") };
}

export default async function Opportunity({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const user = await requireUser(["PROVIDER"], `/fornecedor/oportunidades/${id}`);
  const prov = await myProvider(user.id);
  if (!prov) notFound();
  const { lang, t } = await getT();
  const q = await db.query.quoteRequests.findFirst({
    where: and(eq(quoteRequests.id, id), eq(quoteRequests.providerId, prov.id)),
    with: {
      event: { with: { location: true } },
      category: true,
      consumer: { columns: { name: true, phone: true, email: true } },
      messages: { with: { author: { columns: { name: true } } }, orderBy: (m, { asc }) => [asc(m.createdAt)] },
      proposals: { with: { booking: true }, orderBy: (p, { desc }) => [desc(p.createdAt)] },
    },
  });
  if (!q) notFound();
  const sp = await searchParams;
  const booking = q.proposals.find((p) => p.booking)?.booking ?? null;
  const canPropose = ["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED"].includes(q.status);
  const closed = ["COMPLETED", "CANCELLED", "DECLINED"].includes(q.status);
  const today = new Date().toISOString().slice(0, 10);
  const validDefault = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const eventPast = !q.event.date || q.event.date <= today;
  const prefs = Object.entries(q.event.preferences ?? {}).filter(([k]) => !k.startsWith("servicos_"));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Link href="/fornecedor" className="text-sm font-semibold text-ink-soft hover:text-ink">← {t("Oportunidades", "Opportunities")}</Link>
      <div className="mt-3"><Flash {...sp} /></div>
      <h1 className="text-3xl font-bold">{eventTypeLabel(q.event.type, lang)} · {categoryName(q.category, lang)}</h1>
      <div className="mt-2 flex flex-wrap gap-2"><QuoteStatus status={q.status} />{booking && <BookingStatus status={booking.status} />}</div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Panel>
            <h2 className="text-xl font-bold">{t("Pedido do cliente", "Customer request")}</h2>
            <p className="mt-2 whitespace-pre-line">{q.description}</p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-ink-soft">{t("Data", "Date")}: </dt><dd className="inline">{formatDate(q.event.date, lang)}</dd></div>
              <div><dt className="inline text-ink-soft">{t("Local", "Location")}: </dt><dd className="inline">{q.event.location ? `${q.event.location.name}, ${q.event.location.city}` : t("a definir", "to be defined")}</dd></div>
              <div><dt className="inline text-ink-soft">{t("Convidados", "Guests")}: </dt><dd className="inline">{q.event.guests ?? "—"}</dd></div>
              <div><dt className="inline text-ink-soft">{t("Verba para o serviço", "Budget for the service")}: </dt><dd className="inline">{q.budget != null ? formatBRL(q.budget) : t("não informada", "not provided")}</dd></div>
              {prefs.map(([k, v]) => <div key={k}><dt className="inline text-ink-soft">{k}: </dt><dd className="inline">{typeof v === "string" ? v : JSON.stringify(v)}</dd></div>)}
            </dl>
            {q.viaAi && <p className="mt-3 text-xs text-ink-soft">{t("Este cliente chegou pela recomendação da assistente de IA.", "This customer came from the AI assistant’s recommendation.")}</p>}
          </Panel>

          {booking?.status === "PENDING_CONFIRMATION" && (
            <Panel className="border-ink">
              <h2 className="text-xl font-bold">{t("O cliente aceitou sua proposta", "The customer accepted your proposal")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("Confirme para fechar a contratação e bloquear a data na sua agenda. Se não puder atender, libere a reserva.", "Confirm to close the booking and block the date in your calendar. If you cannot do it, release the reservation.")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={confirmBookingAction}><input type="hidden" name="quoteId" value={q.id} /><Button variant="success">{t("Confirmar contratação", "Confirm booking")} ({formatBRL(booking.amount)})</Button></form>
                <form action={releaseBookingAction} className="flex gap-2">
                  <input type="hidden" name="quoteId" value={q.id} />
                  <label htmlFor="rel" className="sr-only">{t("Motivo", "Reason")}</label>
                  <Input id="rel" name="reason" placeholder={t("Motivo", "Reason")} required className="max-w-48" />
                  <Button variant="outline">{t("Não posso atender", "I can’t do it")}</Button>
                </form>
              </div>
            </Panel>
          )}
          {q.status === "BOOKED" && (
            <Panel>
              <h2 className="text-xl font-bold">{t("Contratação confirmada", "Booking confirmed")}</h2>
              <p className="mt-1 text-sm">{t("Contato do cliente", "Customer contact")}: {q.consumer.name} · {q.consumer.phone ?? t("sem telefone", "no phone")} · {q.consumer.email}</p>
              {eventPast ? (
                <form action={completeAction} className="mt-3"><input type="hidden" name="quoteId" value={q.id} /><Button variant="dark" size="sm">{t("Marcar serviço como concluído", "Mark service as completed")}</Button></form>
              ) : (
                <p className="mt-2 text-xs text-ink-soft">{t("Depois da data do evento, marque como concluído para o cliente poder avaliar.", "After the event date, mark it as completed so the customer can leave a review.")}</p>
              )}
            </Panel>
          )}

          {canPropose && (
            <Panel>
              <h2 className="text-xl font-bold">{q.proposals.some((p) => p.status === "SENT") ? t("Enviar nova proposta", "Send a new proposal") : t("Enviar orçamento", "Send a quote")}</h2>
              <form action={sendProposalAction} className="mt-3 grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <Field label={t("Valor total (R$)", "Total price (R$)")} htmlFor="p-a"><Input id="p-a" name="amount" inputMode="decimal" required placeholder={t("Ex.: 2.400", "E.g. 2400")} /></Field>
                <Field label={t("Válida até", "Valid until")} htmlFor="p-v"><Input id="p-v" name="validUntil" type="date" min={today} defaultValue={validDefault} required /></Field>
                <div className="sm:col-span-2"><Field label={t("O que está incluso", "What is included")} htmlFor="p-d"><Textarea id="p-d" name="description" required placeholder={t("Descreva o serviço, duração, equipe, materiais…", "Describe the service, duration, staff, materials…")} /></Field></div>
                <Field label={t("Itens (um por linha)", "Items (one per line)")} htmlFor="p-i" hint={t("Aparecem como lista para o cliente comparar.", "Shown as a list so the customer can compare.")}><Textarea id="p-i" name="includes" placeholder={t("Montagem e desmontagem\n2 monitores", "Setup and teardown\n2 entertainers")} /></Field>
                <Field label={t("Condições comerciais", "Commercial terms")} htmlFor="p-c" hint={t("Sinal, parcelamento, política de cancelamento.", "Deposit, installments, cancellation policy.")}><Textarea id="p-c" name="conditions" /></Field>
                <div className="sm:col-span-2"><Button>{t("Enviar proposta", "Send proposal")}</Button></div>
              </form>
            </Panel>
          )}

          {q.proposals.length > 0 && (
            <Panel>
              <h2 className="text-xl font-bold">{t("Propostas enviadas", "Proposals sent")}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {q.proposals.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-surface p-3">
                    <span><strong>{formatBRL(p.amount)}</strong> · {formatDateTime(p.createdAt, lang)}</span>
                    <span className="text-ink-soft">{{ SENT: t("Aguardando cliente", "Waiting for customer"), ACCEPTED: t("Aceita", "Accepted"), REJECTED: t("Recusada", "Declined"), EXPIRED: t("Expirada", "Expired"), WITHDRAWN: t("Substituída", "Replaced") }[p.status]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel>
            <h2 className="text-xl font-bold">{t("Conversa", "Conversation")}</h2>
            {q.messages.length === 0 && <p className="mt-2 text-sm text-ink-soft">{t("Nenhuma mensagem ainda.", "No messages yet.")}</p>}
            <ol className="mt-3 space-y-3">
              {q.messages.map((m) => (
                <li key={m.id} className={`rounded-xl p-3 text-sm ${m.kind === "INFO_REQUEST" ? "bg-maracuja-soft" : "bg-surface"}`}>
                  <p className="text-xs text-ink-soft">{m.author?.name ?? t("Sistema", "System")} · {formatDateTime(m.createdAt, lang)}</p>
                  <p className="mt-1 whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>
            {!closed && (
              <form action={providerMessageAction} className="mt-4 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="pm" className="sr-only">{t("Mensagem", "Message")}</label>
                <Textarea id="pm" name="body" required placeholder={t("Escreva uma mensagem ao cliente…", "Write a message to the customer…")} />
                <Button size="sm" variant="dark">{t("Enviar mensagem", "Send message")}</Button>
              </form>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          {(q.status === "NEW") && (
            <Panel>
              <h2 className="font-bold">{t("Primeira resposta", "First reply")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("Responder rápido melhora sua posição nas recomendações.", "Replying quickly improves your position in recommendations.")}</p>
              <form action={markReviewAction} className="mt-3"><input type="hidden" name="quoteId" value={q.id} /><Button size="sm" variant="outline" className="w-full">{t("Marcar como em análise", "Mark as under review")}</Button></form>
            </Panel>
          )}
          {["NEW", "IN_REVIEW", "QUOTED"].includes(q.status) && (
            <Panel>
              <h2 className="font-bold">{t("Pedir mais informações", "Ask for more information")}</h2>
              <form action={askInfoAction} className="mt-2 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="ai" className="sr-only">{t("Pergunta", "Question")}</label>
                <Textarea id="ai" name="body" required placeholder={t("Ex.: qual o horário da festa? O local tem tomada 220V?", "E.g. what time is the party? Does the venue have 220V outlets?")} />
                <Button size="sm" variant="outline" className="w-full">{t("Enviar pergunta", "Send question")}</Button>
              </form>
            </Panel>
          )}
          {["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED"].includes(q.status) && (
            <Panel>
              <h2 className="font-bold">{t("Recusar", "Decline")}</h2>
              <form action={declineAction} className="mt-2 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="dr" className="sr-only">{t("Motivo", "Reason")}</label>
                <Input id="dr" name="reason" placeholder={t("Ex.: sem agenda nesta data", "E.g. not available on this date")} />
                <Button size="sm" variant="ghost" className="w-full">{t("Recusar solicitação", "Decline request")}</Button>
              </form>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
