import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { QuoteStatus } from "@/components/status";
import { Alert, Badge, EmptyState, LinkButton, PageTitle, Stars } from "@/components/ui";
import { eventTypeLabel, formatBRL, formatDate } from "@/lib/format";
import { categoryName } from "@/lib/i18n";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { quoteRequests } from "@/server/db/schema";
import { getT } from "@/server/i18n";
import { addDays, providerAgenda, summarize, todayRio } from "@/server/services/agenda";
import { myProvider } from "@/server/services/providers";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Painel do fornecedor", "Vendor dashboard") };
}

const TABS = [
  { key: "abertas", pt: "Abertas", en: "Open", statuses: ["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED"] },
  { key: "reservas", pt: "Reservas e contratações", en: "Reservations and bookings", statuses: ["PROPOSAL_ACCEPTED", "BOOKED"] },
  { key: "encerradas", pt: "Encerradas", en: "Closed", statuses: ["COMPLETED", "CANCELLED", "DECLINED"] },
];

export default async function ProviderDashboard({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const user = await requireUser(["PROVIDER"], "/fornecedor");
  const prov = await myProvider(user.id);
  const { lang, t } = await getT();
  if (!prov)
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <EmptyState
          title={t("Você ainda não cadastrou sua empresa", "You have not registered your business yet")}
          body={t("Complete o cadastro para começar a receber pedidos.", "Complete your sign-up to start receiving requests.")}
          action={<LinkButton href="/seja-fornecedor">{t("Cadastrar empresa", "Register business")}</LinkButton>}
        />
      </div>
    );
  const { aba = "abertas" } = await searchParams;
  const today = todayRio();
  const [all, next30] = await Promise.all([
    db.query.quoteRequests.findMany({
      where: eq(quoteRequests.providerId, prov.id),
      with: { event: { with: { location: true } }, category: true, consumer: { columns: { name: true } }, proposals: true },
      orderBy: desc(quoteRequests.createdAt),
    }),
    providerAgenda(prov.id, today, addDays(today, 29)),
  ]);
  const agenda = summarize(next30);
  const nextClosed = next30.filter((d) => d.state === "CLOSED" || d.state === "RESERVED").slice(0, 3);
  const tab = TABS.find((x) => x.key === aba) ?? TABS[0];
  const list = all.filter((q) => tab.statuses.includes(q.status));

  const last30 = all.filter((q) => Date.now() - q.createdAt.getTime() < 30 * 86_400_000);
  const responded = last30.filter((q) => q.firstResponseAt).length;
  const booked = all.filter((q) => ["BOOKED", "COMPLETED"].includes(q.status));
  const bookedValue = booked.reduce((s, q) => s + (q.proposals.find((p) => p.status === "ACCEPTED")?.amount ?? 0), 0);
  const quoted = all.filter((q) => q.proposals.length > 0).length;
  const kpis = [
    { label: t("Solicitações (30 dias)", "Requests (30 days)"), value: String(last30.length) },
    { label: t("Taxa de resposta (30 dias)", "Response rate (30 days)"), value: last30.length ? `${Math.round((responded / last30.length) * 100)}%` : "—" },
    { label: t("Conversão proposta → contratação", "Proposal → booking conversion"), value: quoted ? `${Math.round((booked.length / quoted) * 100)}%` : "—" },
    { label: t("Contratado pela Planfest", "Booked through Planfest"), value: formatBRL(bookedValue) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <PageTitle
        title={prov.tradeName}
        subtitle={prov.categories.map((c) => categoryName(c.category, lang)).join(", ")}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/fornecedores/${prov.slug}`} variant="outline" size="sm">{t("Ver perfil público", "View public profile")}</LinkButton>
            <LinkButton href="/fornecedor/agenda" variant="outline" size="sm"><CalendarDays className="size-4" aria-hidden /> {t("Agenda", "Calendar")}</LinkButton>
            <LinkButton href="/fornecedor/perfil" variant="dark" size="sm">{t("Editar perfil e serviços", "Edit profile and services")}</LinkButton>
          </div>
        }
      />
      {prov.status === "PENDING_REVIEW" && (
        <div className="mb-6">
          <Alert tone="warn">{t("Seu cadastro está em análise pela equipe Planfest. Assim que for aprovado, seu perfil aparece no catálogo e nas recomendações da IA.", "Your sign-up is being reviewed by the Planfest team. Once approved, your profile shows up in the catalog and in the AI's recommendations.")}</Alert>
        </div>
      )}
      {prov.status === "REJECTED" && (
        <div className="mb-6"><Alert tone="error">{t("Seu cadastro não foi aprovado. Revise os dados do perfil e fale com o suporte.", "Your sign-up was not approved. Review your profile details and contact support.")}</Alert></div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-surface p-4">
            <p className="font-display text-3xl font-bold">{k.value}</p>
            <p className="text-sm text-ink-soft">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <Stars value={prov.avgRating} count={prov.reviewCount} />
        <Badge tone={prov.verification === "VERIFIED" ? "green" : "neutral"}>{prov.verification === "VERIFIED" ? t("Verificado", "Verified") : t("Não verificado", "Not verified")}</Badge>
      </div>

      <Link href="/fornecedor/agenda" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line p-4 hover:border-ink">
        <span className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-pitanga-soft text-pitanga"><CalendarDays className="size-5" aria-hidden /></span>
          <span>
            <span className="block font-bold">{t("Agenda dos próximos 30 dias", "Next 30 days")}</span>
            <span className="block text-sm text-ink-soft">
              {nextClosed.length
                ? `${t("Próximas datas fechadas", "Next booked dates")}: ${nextClosed.map((d) => formatDate(d.date, lang)).join(" · ")}`
                : t("Nenhuma data fechada no período.", "No booked dates in this period.")}
            </span>
          </span>
        </span>
        <span className="ml-auto flex gap-5 text-sm">
          <span><strong className="block font-display text-2xl">{agenda.available}</strong>{t("livres", "open")}</span>
          <span><strong className="block font-display text-2xl text-folha">{agenda.closed}</strong>{t("fechadas", "booked")}</span>
          <span><strong className="block font-display text-2xl">{agenda.reserved + agenda.requested}</strong>{t("com pedido", "requested")}</span>
          <span><strong className="block font-display text-2xl text-ink-soft">{agenda.blocked}</strong>{t("bloqueadas", "blocked")}</span>
        </span>
      </Link>

      <nav className="mt-8 flex gap-1 border-b border-line" aria-label={t("Filtrar oportunidades", "Filter opportunities")}>
        {TABS.map((x) => {
          const n = all.filter((q) => x.statuses.includes(q.status)).length;
          const active = x.key === tab.key;
          return (
            <Link key={x.key} href={`/fornecedor?aba=${x.key}`} aria-current={active ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${active ? "border-pitanga text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {t(x.pt, x.en)} <span className="text-ink-soft">({n})</span>
            </Link>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("Nada por aqui", "Nothing here")}
            body={
              tab.key === "abertas"
                ? t("Novas solicitações aparecem aqui e você recebe uma notificação. Mantenha perfil, preços e agenda atualizados para aparecer nas recomendações.", "New requests show up here and you get a notification. Keep your profile, prices and calendar up to date to appear in recommendations.")
                : t("Sem itens nesta aba.", "No items in this tab.")
            }
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {list.map((q) => (
            <li key={q.id}>
              <Link href={`/fornecedor/oportunidades/${q.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-surface">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{eventTypeLabel(q.event.type, lang)} · {q.event.guests ?? "?"} {t("convidados", "guests")}</p>
                  <p className="text-sm text-ink-soft">
                    {categoryName(q.category, lang)} · {formatDate(q.event.date, lang)} · {q.event.location?.name ?? t("local a definir", "location to be defined")} · {q.consumer.name.split(" ")[0]}
                    {q.budget != null && ` · ${t("verba", "budget")} ${formatBRL(q.budget)}`}
                  </p>
                </div>
                {q.viaAi && <Badge>{t("via IA", "via AI")}</Badge>}
                <QuoteStatus status={q.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
