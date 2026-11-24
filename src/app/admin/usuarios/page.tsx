import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, Input, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { db } from "@/server/db";
import { complaints, users } from "@/server/db/schema";
import { complaintAction, userStatusAction } from "../actions";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Usuários e reclamações", "Users and complaints") };
}

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const ROLE = { CONSUMER: t("Cliente", "Customer"), PROVIDER: t("Fornecedor", "Vendor"), ADMIN: "Admin" } as const;
  const CSTATUS: Record<string, string> = { OPEN: t("Aberta", "Open"), IN_REVIEW: t("Em análise", "Under review"), RESOLVED: t("Resolvida", "Resolved"), DISMISSED: t("Improcedente", "Dismissed") };
  const [list, comps] = await Promise.all([
    db.query.users.findMany({ orderBy: desc(users.createdAt), limit: 200, columns: { passwordHash: false } }),
    db.query.complaints.findMany({ with: { reporter: { columns: { name: true } }, provider: { columns: { tradeName: true } } }, orderBy: desc(complaints.createdAt) }),
  ]);
  return (
    <>
      <Flash {...sp} />
      <PageTitle title={t("Reclamações", "Complaints")} />
      {comps.length === 0 ? <p className="text-ink-soft">{t("Nenhuma reclamação registrada.", "No complaints filed.")}</p> : (
        <ul className="space-y-3">
          {comps.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line p-4">
              <p className="text-sm text-ink-soft">{c.reporter.name}{c.provider && ` ${t("sobre", "about")} ${c.provider.tradeName}`} · {formatDate(c.createdAt, lang)} · <Badge tone={c.status === "RESOLVED" ? "green" : c.status === "DISMISSED" ? "neutral" : "yellow"}>{CSTATUS[c.status] ?? c.status}</Badge></p>
              <p className="mt-1 font-semibold">{c.subject}</p>
              <p className="text-sm">{c.body}</p>
              {(c.status === "OPEN" || c.status === "IN_REVIEW") && (
                <form action={complaintAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="complaintId" value={c.id} />
                  <Input name="resolution" placeholder={t("Resposta / resolução", "Reply / resolution")} className="max-w-md" />
                  <select name="status" className="rounded-xl border border-line px-3"><option value="IN_REVIEW">{CSTATUS.IN_REVIEW}</option><option value="RESOLVED">{CSTATUS.RESOLVED}</option><option value="DISMISSED">{CSTATUS.DISMISSED}</option></select>
                  <Button size="sm" variant="dark">{t("Atualizar", "Update")}</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-2xl font-bold">{t("Usuários", "Users")}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-ink-soft"><th className="py-2">{t("Nome", "Name")}</th><th>{t("E-mail", "Email")}</th><th>{t("Tipo", "Type")}</th><th>{t("Desde", "Since")}</th><th>{t("Status", "Status")}</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => (
              <tr key={u.id}>
                <td className="py-2">{u.name}{u.isDemo && <span className="ml-1 text-xs text-ink-soft">(demo)</span>}</td>
                <td>{u.email}</td>
                <td>{ROLE[u.role]}</td>
                <td>{formatDate(u.createdAt, lang)}</td>
                <td><Badge tone={u.status === "ACTIVE" ? "green" : "red"}>{u.status === "ACTIVE" ? t("Ativo", "Active") : u.status === "SUSPENDED" ? t("Suspenso", "Suspended") : t("Anonimizado", "Anonymized")}</Badge></td>
                <td className="text-right">
                  {u.role !== "ADMIN" && u.status !== "ANONYMIZED" && (
                    <form action={userStatusAction}>
                      <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                      <Button size="sm" variant="ghost">{u.status === "ACTIVE" ? t("Suspender", "Suspend") : t("Reativar", "Reactivate")}</Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
