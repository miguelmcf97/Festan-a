import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DemoBadge, PageTitle, Stars, VerifiedBadge } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { categoryName } from "@/lib/i18n";
import { getT } from "@/server/i18n";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { events } from "@/server/db/schema";
import { latestPlan } from "@/server/services/planning";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Comparar propostas", "Compare proposals") };
}

export default async function Compare({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["CONSUMER"], `/painel/eventos/${id}`);
  const { lang, t } = await getT();
  const ev = await db.query.events.findFirst({
    where: and(eq(events.id, id), eq(events.ownerId, user.id)),
    with: { quoteRequests: { with: { category: true, provider: true, proposals: true } } },
  });
  if (!ev) notFound();
  const plan = await latestPlan(ev.id);
  const byCat = new Map<string, { name: string; rows: { quoteId: string; provider: (typeof ev.quoteRequests)[number]["provider"]; proposal: (typeof ev.quoteRequests)[number]["proposals"][number] }[] }>();
  for (const q of ev.quoteRequests)
    for (const p of q.proposals.filter((p) => p.status === "SENT" || p.status === "ACCEPTED")) {
      const g = byCat.get(q.categoryId) ?? { name: categoryName(q.category, lang), rows: [] };
      g.rows.push({ quoteId: q.id, provider: q.provider, proposal: p });
      byCat.set(q.categoryId, g);
    }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <Link href="/painel" className="text-sm font-semibold text-ink-soft hover:text-ink">← {t("Minhas festas", "My parties")}</Link>
      <PageTitle title={t("Comparar propostas", "Compare proposals")} subtitle={`${ev.title} · ${formatDate(ev.date, lang)}`} />
      {byCat.size === 0 && <p className="text-ink-soft">{t("Nenhuma proposta recebida ainda.", "No proposals received yet.")}</p>}
      <div className="space-y-8">
        {[...byCat.entries()].map(([catId, g]) => {
          const alloc = plan?.items.find((i) => i.categoryId === catId)?.allocated;
          const min = Math.min(...g.rows.map((r) => r.proposal.amount));
          return (
            <section key={catId}>
              <h2 className="text-2xl font-bold">{g.name}</h2>
              {alloc != null && <p className="text-sm text-ink-soft">{t("Verba sugerida no planejamento", "Suggested budget in the plan")}: {formatBRL(alloc)}</p>}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-ink-soft">
                      <th className="border-b border-line py-2 pr-3 font-semibold">{t("Fornecedor", "Vendor")}</th>
                      <th className="border-b border-line py-2 pr-3 font-semibold">{t("Valor", "Price")}</th>
                      <th className="border-b border-line py-2 pr-3 font-semibold">{t("Inclui", "Includes")}</th>
                      <th className="border-b border-line py-2 pr-3 font-semibold">{t("Condições", "Terms")}</th>
                      <th className="border-b border-line py-2 font-semibold">{t("Validade", "Valid until")}</th>
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
                          {r.proposal.amount === min && g.rows.length > 1 && <p className="text-xs text-folha">{t("menor valor", "lowest price")}</p>}
                          {alloc != null && r.proposal.amount > alloc && <p className="text-xs text-[#8a5a00]">{formatBRL(r.proposal.amount - alloc)} {t("acima da verba", "over budget")}</p>}
                        </td>
                        <td className="border-b border-line py-3 pr-3">{r.proposal.includes.length ? r.proposal.includes.join(", ") : "—"}</td>
                        <td className="border-b border-line py-3 pr-3">{r.proposal.conditions ?? "—"}</td>
                        <td className="border-b border-line py-3">{r.proposal.status === "ACCEPTED" ? t("Aceita", "Accepted") : formatDate(r.proposal.validUntil, lang)}</td>
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
