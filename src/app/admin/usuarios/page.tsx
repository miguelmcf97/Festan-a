import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, Input, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { db } from "@/server/db";
import { complaints, users } from "@/server/db/schema";
import { complaintAction, userStatusAction } from "../actions";

export const metadata: Metadata = { title: "Usuários e reclamações" };
const ROLE = { CONSUMER: "Cliente", PROVIDER: "Fornecedor", ADMIN: "Admin" } as const;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const [list, comps] = await Promise.all([
    db.query.users.findMany({ orderBy: desc(users.createdAt), limit: 200, columns: { passwordHash: false } }),
    db.query.complaints.findMany({ with: { reporter: { columns: { name: true } }, provider: { columns: { tradeName: true } } }, orderBy: desc(complaints.createdAt) }),
  ]);
  return (
    <>
      <Flash {...sp} />
      <PageTitle title="Reclamações" />
      {comps.length === 0 ? <p className="text-ink-soft">Nenhuma reclamação registrada.</p> : (
        <ul className="space-y-3">
          {comps.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line p-4">
              <p className="text-sm text-ink-soft">{c.reporter.name}{c.provider && ` sobre ${c.provider.tradeName}`} · {formatDate(c.createdAt)} · <Badge tone={c.status === "RESOLVED" ? "green" : c.status === "DISMISSED" ? "neutral" : "yellow"}>{c.status}</Badge></p>
              <p className="mt-1 font-semibold">{c.subject}</p>
              <p className="text-sm">{c.body}</p>
              {(c.status === "OPEN" || c.status === "IN_REVIEW") && (
                <form action={complaintAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="complaintId" value={c.id} />
                  <Input name="resolution" placeholder="Resposta / resolução" className="max-w-md" />
                  <select name="status" className="rounded-xl border border-line px-3"><option value="IN_REVIEW">Em análise</option><option value="RESOLVED">Resolvida</option><option value="DISMISSED">Improcedente</option></select>
                  <Button size="sm" variant="dark">Atualizar</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-2xl font-bold">Usuários</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-ink-soft"><th className="py-2">Nome</th><th>E-mail</th><th>Tipo</th><th>Desde</th><th>Status</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => (
              <tr key={u.id}>
                <td className="py-2">{u.name}{u.isDemo && <span className="ml-1 text-xs text-ink-soft">(demo)</span>}</td>
                <td>{u.email}</td>
                <td>{ROLE[u.role]}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td><Badge tone={u.status === "ACTIVE" ? "green" : "red"}>{u.status === "ACTIVE" ? "Ativo" : u.status === "SUSPENDED" ? "Suspenso" : "Anonimizado"}</Badge></td>
                <td className="text-right">
                  {u.role !== "ADMIN" && u.status !== "ANONYMIZED" && (
                    <form action={userStatusAction}>
                      <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                      <Button size="sm" variant="ghost">{u.status === "ACTIVE" ? "Suspender" : "Reativar"}</Button>
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
