import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { QuoteStatus } from "@/components/status";
import { Alert, Badge, EmptyState, LinkButton, PageTitle, Stars } from "@/components/ui";
import { EVENT_TYPE_LABEL, formatBRL, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { quoteRequests } from "@/server/db/schema";
import { myProvider } from "@/server/services/providers";

export const metadata: Metadata = { title: "Painel do fornecedor" };

const TABS = [
  { key: "abertas", label: "Abertas", statuses: ["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED"] },
  { key: "reservas", label: "Reservas e contratações", statuses: ["PROPOSAL_ACCEPTED", "BOOKED"] },
  { key: "encerradas", label: "Encerradas", statuses: ["COMPLETED", "CANCELLED", "DECLINED"] },
];

export default async function ProviderDashboard({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const user = await requireUser(["PROVIDER"], "/fornecedor");
  const prov = await myProvider(user.id);
  if (!prov) return <div className="mx-auto max-w-3xl px-4 pt-10"><EmptyState title="Você ainda não cadastrou sua empresa" body="Complete o cadastro para começar a receber pedidos." action={<LinkButton href="/seja-fornecedor">Cadastrar empresa</LinkButton>} /></div>;
  const { aba = "abertas" } = await searchParams;
  const all = await db.query.quoteRequests.findMany({
    where: eq(quoteRequests.providerId, prov.id),
    with: { event: { with: { location: true } }, category: true, consumer: { columns: { name: true } }, proposals: true },
    orderBy: desc(quoteRequests.createdAt),
  });
  const tab = TABS.find((t) => t.key === aba) ?? TABS[0];
  const list = all.filter((q) => tab.statuses.includes(q.status));

  const last30 = all.filter((q) => Date.now() - q.createdAt.getTime() < 30 * 86_400_000);
  const responded = last30.filter((q) => q.firstResponseAt).length;
  const booked = all.filter((q) => ["BOOKED", "COMPLETED"].includes(q.status));
  const bookedValue = booked.reduce((s, q) => s + (q.proposals.find((p) => p.status === "ACCEPTED")?.amount ?? 0), 0);
  const quoted = all.filter((q) => q.proposals.length > 0).length;
  const kpis = [
    { label: "Solicitações (30 dias)", value: String(last30.length) },
    { label: "Taxa de resposta (30 dias)", value: last30.length ? `${Math.round((responded / last30.length) * 100)}%` : "—" },
    { label: "Conversão proposta → contratação", value: quoted ? `${Math.round((booked.length / quoted) * 100)}%` : "—" },
    { label: "Contratado pela Planfest", value: formatBRL(bookedValue) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <PageTitle title={prov.tradeName} subtitle={prov.categories.map((c) => c.category.name).join(", ")} actions={<div className="flex gap-2"><LinkButton href={`/fornecedores/${prov.slug}`} variant="outline" size="sm">Ver perfil público</LinkButton><LinkButton href="/fornecedor/perfil" variant="dark" size="sm">Editar perfil e agenda</LinkButton></div>} />
      {prov.status === "PENDING_REVIEW" && <div className="mb-6"><Alert tone="warn">Seu cadastro está em análise pela equipe Planfest. Assim que for aprovado, seu perfil aparece no catálogo e nas recomendações da IA.</Alert></div>}
      {prov.status === "REJECTED" && <div className="mb-6"><Alert tone="error">Seu cadastro não foi aprovado. Revise os dados do perfil e fale com o suporte.</Alert></div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-surface p-4">
            <p className="font-display text-3xl font-bold">{k.value}</p>
            <p className="text-sm text-ink-soft">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><Stars value={prov.avgRating} count={prov.reviewCount} /><Badge tone={prov.verification === "VERIFIED" ? "green" : "neutral"}>{prov.verification === "VERIFIED" ? "Verificado" : "Não verificado"}</Badge></div>

      <nav className="mt-8 flex gap-1 border-b border-line" aria-label="Filtrar oportunidades">
        {TABS.map((t) => {
          const n = all.filter((q) => t.statuses.includes(q.status)).length;
          const active = t.key === tab.key;
          return (
            <Link key={t.key} href={`/fornecedor?aba=${t.key}`} aria-current={active ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${active ? "border-pitanga text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {t.label} <span className="text-ink-soft">({n})</span>
            </Link>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <div className="mt-6"><EmptyState title="Nada por aqui" body={tab.key === "abertas" ? "Novas solicitações aparecem aqui e você recebe uma notificação. Mantenha perfil, preços e agenda atualizados para aparecer nas recomendações." : "Sem itens nesta aba."} /></div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {list.map((q) => (
            <li key={q.id}>
              <Link href={`/fornecedor/oportunidades/${q.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-surface">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{EVENT_TYPE_LABEL[q.event.type]} · {q.event.guests ?? "?"} convidados</p>
                  <p className="text-sm text-ink-soft">
                    {q.category.name} · {formatDate(q.event.date)} · {q.event.location?.name ?? "local a definir"} · {q.consumer.name.split(" ")[0]}
                    {q.budget != null && ` · verba ${formatBRL(q.budget)}`}
                  </p>
                </div>
                {q.viaAi && <Badge>via IA</Badge>}
                <QuoteStatus status={q.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
