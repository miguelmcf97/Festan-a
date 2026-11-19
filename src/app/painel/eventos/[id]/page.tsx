import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DemoBadge, PageTitle, Stars, VerifiedBadge } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { events } from "@/server/db/schema";
import { latestPlan } from "@/server/services/planning";

export const metadata: Metadata = { title: "Comparar propostas" };

export default async function Compare({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["CONSUMER"], `/painel/eventos/${id}`);
  const ev = await db.query.events.findFirst({
    where: and(eq(events.id, id), eq(events.ownerId, user.id)),
    with: { quoteRequests: { with: { category: true, provider: true, proposals: true } } },
  });
  if (!ev) notFound();
  const plan = await latestPlan(ev.id);
  const byCat = new Map<string, { name: string; rows: { quoteId: string; provider: (typeof ev.quoteRequests)[number]["provider"]; proposal: (typeof ev.quoteRequests)[number]["proposals"][number] }[] }>();
  for (const q of ev.quoteRequests)
    for (const p of q.proposals.filter((p) => p.status === "SENT" || p.status === "ACCEPTED")) {
      const g = byCat.get(q.categoryId) ?? { name: q.category.name, rows: [] };
      g.rows.push({ quoteId: q.id, provider: q.provider, proposal: p });
      byCat.set(q.categoryId, g);
    }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Link href="/painel" className="text-sm font-semibold text-ink-soft hover:text-ink">← Minhas festas</Link>
      <PageTitle title="Comparar propostas" subtitle={`${ev.title} · ${formatDate(ev.date)}`} />
      {byCat.size === 0 && <p className="text-ink-soft">Nenhuma proposta recebida ainda.</p>}
      <div className="space-y-8">
        {[...byCat.entries()].map(([catId, g]) => {
          const alloc = plan?.items.find((i) => i.categoryId === catId)?.allocated;
          const min = Math.min(...g.rows.map((r) => r.proposal.amount));
          return (
            <section key={catId}>
              <h2 className="text-2xl font-bold">{g.name}</h2>
              {alloc != null && <p className="text-sm text-ink-soft">Verba sugerida no planejamento: {formatBRL(alloc)}</p>}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-ink-soft">
                      <th className="border-b border-line py-2 pr-3 font-semibold">Fornecedor</th>
                      <th className="border-b border-line py-2 pr-3 font-semibold">Valor</th>
                      <th className="border-b border-line py-2 pr-3 font-semibold">Inclui</th>
                      <th className="border-b border-line py-2 pr-3 font-semibold">Condições</th>
                      <th className="border-b border-line py-2 font-semibold">Validade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.proposal.id} className="align-top">
                        <td className="border-b border-line py-3 pr-3">
                          <Link href={`/painel/solicitacoes/${r.quoteId}`} className="font-semibold hover:underline">{r.provider.tradeName}</Link>
                          <div className="mt-1 flex flex-wrap gap-1"><VerifiedBadge verified={r.provider.verification === "VERIFIED"} />{r.provider.isDemo && <DemoBadge />}</div>
                          <div className="mt-1"><Stars value={r.provider.avgRating} count={r.provider.reviewCount} /></div>
                        </td>
                        <td className="border-b border-line py-3 pr-3">
                          <strong className="font-display text-lg">{formatBRL(r.proposal.amount)}</strong>
                          {r.proposal.amount === min && g.rows.length > 1 && <p className="text-xs text-folha">menor valor</p>}
                          {alloc != null && r.proposal.amount > alloc && <p className="text-xs text-[#8a5a00]">{formatBRL(r.proposal.amount - alloc)} acima da verba</p>}
                        </td>
                        <td className="border-b border-line py-3 pr-3">{r.proposal.includes.length ? r.proposal.includes.join(", ") : "—"}</td>
                        <td className="border-b border-line py-3 pr-3">{r.proposal.conditions ?? "—"}</td>
                        <td className="border-b border-line py-3">{r.proposal.status === "ACCEPTED" ? "Aceita" : formatDate(r.proposal.validUntil)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
