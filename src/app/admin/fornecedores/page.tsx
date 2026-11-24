import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, DemoBadge, EmptyState, PageTitle } from "@/components/ui";
import { formatDate, maskDocument } from "@/lib/format";
import { categoryName, type T } from "@/lib/i18n";
import { db } from "@/server/db";
import { providers } from "@/server/db/schema";
import { getT } from "@/server/i18n";
import { providerDecisionAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Fornecedores", "Vendors") };
}

type Row = Awaited<ReturnType<typeof load>>[number];
type TabKey = "aprovar" | "verificar" | "verificados" | "outros";

async function load(newestFirst: boolean) {
  return db.query.providers.findMany({
    with: { location: true, categories: { with: { category: true } }, owner: { columns: { email: true } } },
    orderBy: newestFirst ? desc(providers.createdAt) : asc(providers.createdAt),
  });
}

const TABS: { key: TabKey; pt: string; en: string; hintPt: string; hintEn: string; match: (p: Row) => boolean }[] = [
  {
    key: "aprovar",
    pt: "Aprovar",
    en: "Approve",
    hintPt: "Cadastros novos aguardando análise. Confira dados e categoria antes de aprovar.",
    hintEn: "New sign-ups waiting for review. Check the details and category before approving.",
    match: (p) => p.status === "PENDING_REVIEW",
  },
  {
    key: "verificar",
    pt: "Verificar",
    en: "Verify",
    hintPt: "Aprovados sem selo. Conceda o selo só depois de conferir documento e contato.",
    hintEn: "Approved, without the badge. Grant it only after checking the ID document and contact.",
    match: (p) => p.status === "APPROVED" && p.verification !== "VERIFIED",
  },
  {
    key: "verificados",
    pt: "Remover selo",
    en: "Remove badge",
    hintPt: "Fornecedores com selo de verificado. Remova o selo se os dados deixarem de ser válidos.",
    hintEn: "Vendors with the verified badge. Remove it if their details are no longer valid.",
    match: (p) => p.status === "APPROVED" && p.verification === "VERIFIED",
  },
  {
    key: "outros",
    pt: "Suspensos e rejeitados",
    en: "Suspended and rejected",
    hintPt: "Cadastros fora do catálogo. Reative quando o problema for resolvido.",
    hintEn: "Profiles hidden from the catalog. Reactivate once the issue is solved.",
    match: (p) => p.status === "SUSPENDED" || p.status === "REJECTED",
  },
];

export default async function AdminProviders({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string; aba?: string; ordem?: string }> }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const newestFirst = sp.ordem === "recentes";
  const all = await load(newestFirst);
  const tab = TABS.find((x) => x.key === sp.aba) ?? TABS[0];
  const list = all.filter(tab.match);
  const orderQs = newestFirst ? "&ordem=recentes" : "";
  const now = Date.now();

  const STATUS: Record<string, { label: string; tone: "yellow" | "green" | "red" | "neutral" }> = {
    PENDING_REVIEW: { label: t("Aguardando aprovação", "Waiting for approval"), tone: "yellow" },
    APPROVED: { label: t("Aprovado", "Approved"), tone: "green" },
    REJECTED: { label: t("Rejeitado", "Rejected"), tone: "red" },
    SUSPENDED: { label: t("Suspenso", "Suspended"), tone: "red" },
  };

  return (
    <>
      <Flash ok={sp.ok} erro={sp.erro} />
      <PageTitle
        title={t("Fornecedores", "Vendors")}
        subtitle={t("Cada aba é uma etapa da análise. A lista segue a data da solicitação de cadastro.", "Each tab is a review step. The list follows the sign-up request date.")}
      />

      <nav className="flex flex-wrap gap-1 border-b border-line" aria-label={t("Etapas da análise", "Review steps")}>
        {TABS.map((x) => {
          const n = all.filter(x.match).length;
          const active = x.key === tab.key;
          return (
            <Link
              key={x.key}
              href={`/admin/fornecedores?aba=${x.key}${orderQs}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${active ? "border-pitanga text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
            >
              {t(x.pt, x.en)} <span className={n && x.key !== "verificados" && x.key !== "outros" ? "text-pitanga" : "text-ink-soft"}>({n})</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{t(tab.hintPt, tab.hintEn)}</p>
        <div className="flex items-center gap-1 text-sm" role="group" aria-label={t("Ordem da lista", "List order")}>
          <span className="text-ink-soft">{t("Ordem:", "Order:")}</span>
          <Link href={`/admin/fornecedores?aba=${tab.key}`} aria-current={!newestFirst ? "true" : undefined} className={`rounded-full px-3 py-1 font-semibold ${!newestFirst ? "bg-ink text-white" : "text-ink-soft hover:bg-surface"}`}>
            {t("Mais antigas primeiro", "Oldest first")}
          </Link>
          <Link href={`/admin/fornecedores?aba=${tab.key}&ordem=recentes`} aria-current={newestFirst ? "true" : undefined} className={`rounded-full px-3 py-1 font-semibold ${newestFirst ? "bg-ink text-white" : "text-ink-soft hover:bg-surface"}`}>
            {t("Mais recentes primeiro", "Newest first")}
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={t("Nenhum fornecedor nesta etapa", "No vendors in this step")} body={t("Quando houver cadastros aqui, eles aparecem pela data da solicitação.", "When there are sign-ups here, they show up by request date.")} />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("Solicitado em", "Requested on")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("Fornecedor", "Vendor")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("Situação", "Status")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("Ação", "Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((p) => {
                const days = Math.floor((now - p.createdAt.getTime()) / 86_400_000);
                return (
                  <tr key={p.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-semibold">{formatDate(p.createdAt, lang)}</p>
                      <p className="text-xs text-ink-soft">{days === 0 ? t("hoje", "today") : t(`há ${days} ${days === 1 ? "dia" : "dias"}`, `${days} ${days === 1 ? "day" : "days"} ago`)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {p.status === "APPROVED" ? <Link href={`/fornecedores/${p.slug}`} className="hover:underline">{p.tradeName}</Link> : p.tradeName}
                      </p>
                      <p className="text-ink-soft">
                        {p.categories.map((c) => categoryName(c.category, lang)).join(", ") || t("sem categoria", "no category")} · {p.location.name}
                      </p>
                      <p className="text-xs text-ink-soft">{p.docType} {maskDocument(p.document)} · {p.owner.email} · {p.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                        <Badge tone={p.verification === "VERIFIED" ? "green" : "neutral"}>{p.verification === "VERIFIED" ? t("Verificado", "Verified") : t("Não verificado", "Not verified")}</Badge>
                        {p.isDemo && <DemoBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Actions p={p} tab={tab.key} newestFirst={newestFirst} t={t} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Actions({ p, tab, newestFirst, t }: { p: Row; tab: TabKey; newestFirst: boolean; t: T }) {
  const Act = ({ decision, label, variant = "outline" }: { decision: string; label: string; variant?: "outline" | "success" | "ghost" | "dark" }) => (
    <form action={providerDecisionAction}>
      <input type="hidden" name="providerId" value={p.id} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="aba" value={tab} />
      {newestFirst && <input type="hidden" name="ordem" value="recentes" />}
      <Button size="sm" variant={variant} aria-label={`${label}: ${p.tradeName}`}>{label}</Button>
    </form>
  );
  if (p.status === "PENDING_REVIEW")
    return (
      <>
        <Act decision="APPROVE" label={t("Aprovar", "Approve")} variant="success" />
        <Act decision="REJECT" label={t("Rejeitar", "Reject")} variant="ghost" />
      </>
    );
  if (p.status === "APPROVED")
    return (
      <>
        {p.verification === "VERIFIED" ? (
          <Act decision="UNVERIFY" label={t("Remover selo", "Remove badge")} variant="outline" />
        ) : (
          <Act decision="VERIFY" label={t("Verificar", "Verify")} variant="dark" />
        )}
        <Act decision="SUSPEND" label={t("Suspender", "Suspend")} variant="ghost" />
      </>
    );
  return <Act decision="REACTIVATE" label={t("Reativar", "Reactivate")} />;
}
