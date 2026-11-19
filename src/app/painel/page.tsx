import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Flash, QuoteStatus } from "@/components/status";
import { EmptyState, LinkButton, PageTitle } from "@/components/ui";
import { EVENT_TYPE_LABEL, formatBRL, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { aiConversations, events } from "@/server/db/schema";

export const metadata: Metadata = { title: "Minhas festas" };

export default async function Painel({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser(["CONSUMER"], "/painel");
  const sp = await searchParams;
  const evs = await db.query.events.findMany({
    where: eq(events.ownerId, user.id),
    orderBy: desc(events.createdAt),
    with: {
      location: true,
      quoteRequests: { with: { provider: { columns: { tradeName: true, isDemo: true } }, category: true, proposals: true }, orderBy: (q, { desc }) => [desc(q.updatedAt)] },
    },
  });
  const convs = await db.query.aiConversations.findMany({ where: eq(aiConversations.userId, user.id), columns: { id: true, eventId: true } });
  const convByEvent = new Map(convs.map((c) => [c.eventId, c.id]));
  const visible = evs.filter((e) => e.status !== "DONE" || e.quoteRequests.length > 0).filter((e) => e.title !== "Novo evento" || e.quoteRequests.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Flash {...sp} />
      <PageTitle title={`Olá, ${user.name.split(" ")[0]}`} subtitle="Suas festas, pedidos de orçamento e contratações." actions={<LinkButton href="/planejar">Planejar nova festa</LinkButton>} />
      {visible.length === 0 ? (
        <EmptyState title="Nenhuma festa por aqui ainda" body="Comece descrevendo sua festa para a assistente. Ela monta o planejamento e indica fornecedores." action={<LinkButton href="/planejar">Planejar com IA</LinkButton>} />
      ) : (
        <div className="space-y-6">
          {visible.map((e) => {
            const quotes = e.quoteRequests.length;
            const proposals = e.quoteRequests.reduce((n, q) => n + q.proposals.filter((p) => p.status === "SENT").length, 0);
            return (
              <section key={e.id} className="rounded-2xl border border-line">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
                  <div>
                    <p className="text-sm text-ink-soft">{EVENT_TYPE_LABEL[e.type]}</p>
                    <h2 className="text-2xl font-bold">{e.title}</h2>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" aria-hidden />{formatDate(e.date)}</span>
                      {e.location && <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{e.location.name}</span>}
                      {e.guests && <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />{e.guests} convidados</span>}
                      {e.budgetTotal && <span>Orçamento {formatBRL(e.budgetTotal)}</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {convByEvent.get(e.id) && <LinkButton href={`/planejar?c=${convByEvent.get(e.id)}`} variant="outline" size="sm">Abrir planejamento</LinkButton>}
                    {proposals > 1 && <LinkButton href={`/painel/eventos/${e.id}`} variant="dark" size="sm">Comparar {proposals} propostas</LinkButton>}
                  </div>
                </div>
                {quotes === 0 ? (
                  <p className="p-5 text-sm text-ink-soft">Nenhuma solicitação enviada ainda.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {e.quoteRequests.map((q) => {
                      const open = q.proposals.find((p) => p.status === "SENT");
                      return (
                        <li key={q.id}>
                          <Link href={`/painel/solicitacoes/${q.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-surface">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">{q.provider.tradeName}</p>
                              <p className="text-sm text-ink-soft">{q.category.name}{open && ` · proposta de ${formatBRL(open.amount)}`}</p>
                            </div>
                            <QuoteStatus status={q.status} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
