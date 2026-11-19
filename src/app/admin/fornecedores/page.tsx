import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, DemoBadge, PageTitle } from "@/components/ui";
import { maskDocument } from "@/lib/format";
import { db } from "@/server/db";
import { providers } from "@/server/db/schema";
import { providerDecisionAction } from "../actions";

export const metadata: Metadata = { title: "Fornecedores" };

const STATUS: Record<string, { label: string; tone: "yellow" | "green" | "red" | "neutral" }> = {
  PENDING_REVIEW: { label: "Aguardando aprovação", tone: "yellow" },
  APPROVED: { label: "Aprovado", tone: "green" },
  REJECTED: { label: "Rejeitado", tone: "red" },
  SUSPENDED: { label: "Suspenso", tone: "red" },
};

function Act({ id, decision, label, variant = "outline" }: { id: string; decision: string; label: string; variant?: "outline" | "success" | "ghost" | "dark" }) {
  return (
    <form action={providerDecisionAction}>
      <input type="hidden" name="providerId" value={id} /><input type="hidden" name="decision" value={decision} />
      <Button size="sm" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function AdminProviders({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const list = await db.query.providers.findMany({ with: { location: true, categories: { with: { category: true } }, owner: { columns: { email: true } } }, orderBy: desc(providers.createdAt) });
  list.sort((a, b) => (a.status === "PENDING_REVIEW" ? -1 : 0) - (b.status === "PENDING_REVIEW" ? -1 : 0));
  return (
    <>
      <Flash {...sp} />
      <PageTitle title="Fornecedores" subtitle="Aprove cadastros e conceda o selo de verificado somente após conferir documento e contato." />
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {p.status === "APPROVED" ? <Link href={`/fornecedores/${p.slug}`} className="hover:underline">{p.tradeName}</Link> : p.tradeName}
              </p>
              <p className="text-sm text-ink-soft">{p.categories.map((c) => c.category.name).join(", ")} · {p.location.name} · {p.docType} {maskDocument(p.document)} · {p.owner.email}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                <Badge tone={p.verification === "VERIFIED" ? "green" : "neutral"}>{p.verification === "VERIFIED" ? "Verificado" : "Não verificado"}</Badge>
                {p.isDemo && <DemoBadge />}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.status === "PENDING_REVIEW" && <><Act id={p.id} decision="APPROVE" label="Aprovar" variant="success" /><Act id={p.id} decision="REJECT" label="Rejeitar" /></>}
              {p.status === "APPROVED" && (p.verification === "VERIFIED" ? <Act id={p.id} decision="UNVERIFY" label="Remover selo" variant="ghost" /> : <Act id={p.id} decision="VERIFY" label="Verificar" variant="dark" />)}
              {p.status === "APPROVED" && <Act id={p.id} decision="SUSPEND" label="Suspender" variant="ghost" />}
              {(p.status === "SUSPENDED" || p.status === "REJECTED") && <Act id={p.id} decision="REACTIVATE" label="Reativar" />}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
