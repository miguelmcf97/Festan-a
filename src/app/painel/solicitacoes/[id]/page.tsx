import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookingStatus, Flash, QuoteStatus } from "@/components/status";
import { Button, DemoBadge, Input, Panel, Select, Textarea } from "@/components/ui";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { quoteRequests } from "@/server/db/schema";
import { acceptProposalAction, cancelQuoteAction, complaintAction, consumerMessageAction, rejectProposalAction, reviewAction } from "../../actions";

export const metadata: Metadata = { title: "Solicitação de orçamento" };

export default async function QuoteDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const user = await requireUser(["CONSUMER"], `/painel/solicitacoes/${id}`);
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
      <Link href="/painel" className="text-sm font-semibold text-ink-soft hover:text-ink">← Minhas festas</Link>
      <div className="mt-3"><Flash {...sp} /></div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{q.category.name} · {q.event.title}</p>
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
              <h2 className="text-xl font-bold">Propostas</h2>
              <ul className="mt-3 space-y-4">
                {q.proposals.map((p) => (
                  <li key={p.id} className={`rounded-xl border p-4 ${p.status === "SENT" ? "border-ink" : "border-line opacity-80"}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-display text-2xl font-bold">{formatBRL(p.amount)}</p>
                      <span className="text-xs text-ink-soft">
                        {p.status === "SENT" ? `válida até ${formatDate(p.validUntil)}` : { ACCEPTED: "Aceita", REJECTED: "Recusada", EXPIRED: "Expirada", WITHDRAWN: "Substituída por nova proposta" }[p.status]}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line">{p.description}</p>
                    {p.includes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{p.includes.map((i) => <li key={i}>{i}</li>)}</ul>}
                    {p.conditions && <p className="mt-2 text-sm text-ink-soft"><strong>Condições:</strong> {p.conditions}</p>}
                    {p.status === "SENT" && q.status === "QUOTED" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <form action={acceptProposalAction}>
                          <input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="proposalId" value={p.id} />
                          <Button size="sm">Aceitar proposta</Button>
                        </form>
                        <form action={rejectProposalAction}>
                          <input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="proposalId" value={p.id} />
                          <Button size="sm" variant="outline">Recusar</Button>
                        </form>
                      </div>
                    )}
                    {p.status === "SENT" && q.status === "QUOTED" && (
                      <p className="mt-2 text-xs text-ink-soft">Ao aceitar, a data fica reservada e o fornecedor confirma a contratação. Pagamentos são combinados diretamente com o fornecedor nesta versão.</p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {booking?.status === "PENDING_CONFIRMATION" && (
            <p className="rounded-xl bg-maracuja-soft p-4 text-sm text-[#6b4800]">Você aceitou a proposta. A contratação ainda <strong>não está confirmada</strong>: aguardando o fornecedor confirmar.</p>
          )}

          {booking?.status === "COMPLETED" && !booking.review && (
            <Panel>
              <h2 className="text-xl font-bold">Avalie {q.provider.tradeName}</h2>
              <form action={reviewAction} className="mt-3 space-y-3">
                <input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="bookingId" value={booking.id} />
                <label className="block text-sm font-semibold" htmlFor="rv-r">Nota</label>
                <Select id="rv-r" name="rating" defaultValue="5" className="max-w-40">
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "estrela" : "estrelas"}</option>)}
                </Select>
                <label className="block text-sm font-semibold" htmlFor="rv-c">Como foi?</label>
                <Textarea id="rv-c" name="comment" required minLength={10} />
                <Button>Enviar avaliação</Button>
              </form>
            </Panel>
          )}
          {booking?.review && <p className="rounded-xl bg-surface p-4 text-sm">Sua avaliação ({booking.review.rating}★) está {booking.review.status === "PUBLISHED" ? "publicada" : booking.review.status === "PENDING" ? "em moderação" : "não aprovada"}.</p>}

          <Panel>
            <h2 className="text-xl font-bold">Conversa</h2>
            <ol className="mt-3 space-y-3">
              <li className="rounded-xl bg-surface p-3 text-sm">
                <p className="text-xs text-ink-soft">Sua solicitação · {formatDateTime(q.createdAt)}</p>
                <p className="mt-1 whitespace-pre-line">{q.description}</p>
                {q.budget != null && <p className="mt-1 text-ink-soft">Verba informada: {formatBRL(q.budget)}</p>}
              </li>
              {q.messages.map((m) => (
                <li key={m.id} className={`rounded-xl p-3 text-sm ${m.kind === "INFO_REQUEST" ? "bg-maracuja-soft" : "bg-surface"}`}>
                  <p className="text-xs text-ink-soft">{m.kind === "INFO_REQUEST" ? "Pedido de informação · " : ""}{m.author?.name ?? "Sistema"} · {formatDateTime(m.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>
            {!closed && (
              <form action={consumerMessageAction} className="mt-4 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="msg" className="sr-only">Mensagem</label>
                <Textarea id="msg" name="body" placeholder={q.status === "AWAITING_INFO" ? "Responda o que o fornecedor perguntou…" : "Escreva uma mensagem…"} required />
                <Button size="sm" variant="dark">Enviar mensagem</Button>
              </form>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <h2 className="font-bold">Evento</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div><dt className="inline text-ink-soft">Data: </dt><dd className="inline">{formatDate(q.event.date)}</dd></div>
              <div><dt className="inline text-ink-soft">Local: </dt><dd className="inline">{q.event.location ? `${q.event.location.name}, ${q.event.location.city}` : "a definir"}</dd></div>
              <div><dt className="inline text-ink-soft">Convidados: </dt><dd className="inline">{q.event.guests ?? "—"}</dd></div>
            </dl>
          </Panel>
          {showContact && (
            <Panel>
              <h2 className="font-bold">Contato do fornecedor</h2>
              <p className="mt-2 text-sm">{q.provider.whatsapp ?? q.provider.phone}<br />{q.provider.email}</p>
            </Panel>
          )}
          {canCancel && (
            <Panel>
              <h2 className="font-bold">Cancelar solicitação</h2>
              <form action={cancelQuoteAction} className="mt-2 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="reason" className="sr-only">Motivo</label>
                <Input id="reason" name="reason" placeholder="Motivo (opcional)" />
                <Button size="sm" variant="outline" className="w-full">Cancelar</Button>
              </form>
            </Panel>
          )}
          <details className="rounded-2xl border border-line p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Relatar um problema</summary>
            <form action={complaintAction} className="mt-3 space-y-2">
              <input type="hidden" name="quoteId" value={q.id} />
              <label htmlFor="cs" className="sr-only">Assunto</label>
              <Input id="cs" name="subject" placeholder="Assunto" required />
              <label htmlFor="cb" className="sr-only">Descrição</label>
              <Textarea id="cb" name="body" placeholder="O que aconteceu?" required />
              <Button size="sm" variant="outline" className="w-full">Enviar para a Planfest</Button>
            </form>
          </details>
        </aside>
      </div>
    </div>
  );
}
