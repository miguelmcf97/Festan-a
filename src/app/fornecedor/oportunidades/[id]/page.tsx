import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookingStatus, Flash, QuoteStatus } from "@/components/status";
import { Button, Field, Input, Panel, Textarea } from "@/components/ui";
import { EVENT_TYPE_LABEL, formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { quoteRequests } from "@/server/db/schema";
import { myProvider } from "@/server/services/providers";
import {
  askInfoAction, completeAction, confirmBookingAction, declineAction, markReviewAction, providerMessageAction, releaseBookingAction, sendProposalAction,
} from "../../actions";

export const metadata: Metadata = { title: "Oportunidade" };

export default async function Opportunity({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const user = await requireUser(["PROVIDER"], `/fornecedor/oportunidades/${id}`);
  const prov = await myProvider(user.id);
  if (!prov) notFound();
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
      <Link href="/fornecedor" className="text-sm font-semibold text-ink-soft hover:text-ink">← Oportunidades</Link>
      <div className="mt-3"><Flash {...sp} /></div>
      <h1 className="text-3xl font-bold">{EVENT_TYPE_LABEL[q.event.type]} · {q.category.name}</h1>
      <div className="mt-2 flex flex-wrap gap-2"><QuoteStatus status={q.status} />{booking && <BookingStatus status={booking.status} />}</div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Panel>
            <h2 className="text-xl font-bold">Pedido do cliente</h2>
            <p className="mt-2 whitespace-pre-line">{q.description}</p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-ink-soft">Data: </dt><dd className="inline">{formatDate(q.event.date)}</dd></div>
              <div><dt className="inline text-ink-soft">Local: </dt><dd className="inline">{q.event.location ? `${q.event.location.name}, ${q.event.location.city}` : "a definir"}</dd></div>
              <div><dt className="inline text-ink-soft">Convidados: </dt><dd className="inline">{q.event.guests ?? "—"}</dd></div>
              <div><dt className="inline text-ink-soft">Verba para o serviço: </dt><dd className="inline">{q.budget != null ? formatBRL(q.budget) : "não informada"}</dd></div>
              {prefs.map(([k, v]) => <div key={k}><dt className="inline text-ink-soft">{k}: </dt><dd className="inline">{typeof v === "string" ? v : JSON.stringify(v)}</dd></div>)}
            </dl>
            {q.viaAi && <p className="mt-3 text-xs text-ink-soft">Este cliente chegou pela recomendação da assistente de IA.</p>}
          </Panel>

          {booking?.status === "PENDING_CONFIRMATION" && (
            <Panel className="border-ink">
              <h2 className="text-xl font-bold">O cliente aceitou sua proposta</h2>
              <p className="mt-1 text-sm text-ink-soft">Confirme para fechar a contratação e bloquear a data na sua agenda. Se não puder atender, libere a reserva.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={confirmBookingAction}><input type="hidden" name="quoteId" value={q.id} /><Button variant="success">Confirmar contratação ({formatBRL(booking.amount)})</Button></form>
                <form action={releaseBookingAction} className="flex gap-2">
                  <input type="hidden" name="quoteId" value={q.id} />
                  <label htmlFor="rel" className="sr-only">Motivo</label>
                  <Input id="rel" name="reason" placeholder="Motivo" required className="max-w-48" />
                  <Button variant="outline">Não posso atender</Button>
                </form>
              </div>
            </Panel>
          )}
          {q.status === "BOOKED" && (
            <Panel>
              <h2 className="text-xl font-bold">Contratação confirmada</h2>
              <p className="mt-1 text-sm">Contato do cliente: {q.consumer.name} · {q.consumer.phone ?? "sem telefone"} · {q.consumer.email}</p>
              {eventPast ? (
                <form action={completeAction} className="mt-3"><input type="hidden" name="quoteId" value={q.id} /><Button variant="dark" size="sm">Marcar serviço como concluído</Button></form>
              ) : (
                <p className="mt-2 text-xs text-ink-soft">Depois da data do evento, marque como concluído para o cliente poder avaliar.</p>
              )}
            </Panel>
          )}

          {canPropose && (
            <Panel>
              <h2 className="text-xl font-bold">{q.proposals.some((p) => p.status === "SENT") ? "Enviar nova proposta" : "Enviar orçamento"}</h2>
              <form action={sendProposalAction} className="mt-3 grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <Field label="Valor total (R$)" htmlFor="p-a"><Input id="p-a" name="amount" inputMode="decimal" required placeholder="Ex.: 2.400" /></Field>
                <Field label="Válida até" htmlFor="p-v"><Input id="p-v" name="validUntil" type="date" min={today} defaultValue={validDefault} required /></Field>
                <div className="sm:col-span-2"><Field label="O que está incluso" htmlFor="p-d"><Textarea id="p-d" name="description" required placeholder="Descreva o serviço, duração, equipe, materiais…" /></Field></div>
                <Field label="Itens (um por linha)" htmlFor="p-i" hint="Aparecem como lista para o cliente comparar."><Textarea id="p-i" name="includes" placeholder={"Montagem e desmontagem\n2 monitores"} /></Field>
                <Field label="Condições comerciais" htmlFor="p-c" hint="Sinal, parcelamento, política de cancelamento."><Textarea id="p-c" name="conditions" /></Field>
                <div className="sm:col-span-2"><Button>Enviar proposta</Button></div>
              </form>
            </Panel>
          )}

          {q.proposals.length > 0 && (
            <Panel>
              <h2 className="text-xl font-bold">Propostas enviadas</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {q.proposals.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-surface p-3">
                    <span><strong>{formatBRL(p.amount)}</strong> · {formatDateTime(p.createdAt)}</span>
                    <span className="text-ink-soft">{{ SENT: "Aguardando cliente", ACCEPTED: "Aceita", REJECTED: "Recusada", EXPIRED: "Expirada", WITHDRAWN: "Substituída" }[p.status]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel>
            <h2 className="text-xl font-bold">Conversa</h2>
            {q.messages.length === 0 && <p className="mt-2 text-sm text-ink-soft">Nenhuma mensagem ainda.</p>}
            <ol className="mt-3 space-y-3">
              {q.messages.map((m) => (
                <li key={m.id} className={`rounded-xl p-3 text-sm ${m.kind === "INFO_REQUEST" ? "bg-maracuja-soft" : "bg-surface"}`}>
                  <p className="text-xs text-ink-soft">{m.author?.name ?? "Sistema"} · {formatDateTime(m.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>
            {!closed && (
              <form action={providerMessageAction} className="mt-4 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="pm" className="sr-only">Mensagem</label>
                <Textarea id="pm" name="body" required placeholder="Escreva uma mensagem ao cliente…" />
                <Button size="sm" variant="dark">Enviar mensagem</Button>
              </form>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          {(q.status === "NEW") && (
            <Panel>
              <h2 className="font-bold">Primeira resposta</h2>
              <p className="mt-1 text-sm text-ink-soft">Responder rápido melhora sua posição nas recomendações.</p>
              <form action={markReviewAction} className="mt-3"><input type="hidden" name="quoteId" value={q.id} /><Button size="sm" variant="outline" className="w-full">Marcar como em análise</Button></form>
            </Panel>
          )}
          {["NEW", "IN_REVIEW", "QUOTED"].includes(q.status) && (
            <Panel>
              <h2 className="font-bold">Pedir mais informações</h2>
              <form action={askInfoAction} className="mt-2 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="ai" className="sr-only">Pergunta</label>
                <Textarea id="ai" name="body" required placeholder="Ex.: qual o horário da festa? O local tem tomada 220V?" />
                <Button size="sm" variant="outline" className="w-full">Enviar pergunta</Button>
              </form>
            </Panel>
          )}
          {["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED"].includes(q.status) && (
            <Panel>
              <h2 className="font-bold">Recusar</h2>
              <form action={declineAction} className="mt-2 space-y-2">
                <input type="hidden" name="quoteId" value={q.id} />
                <label htmlFor="dr" className="sr-only">Motivo</label>
                <Input id="dr" name="reason" placeholder="Ex.: sem agenda nesta data" />
                <Button size="sm" variant="ghost" className="w-full">Recusar solicitação</Button>
              </form>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
