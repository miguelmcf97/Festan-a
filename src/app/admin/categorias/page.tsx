import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, CategoryIcon, Input, PageTitle } from "@/components/ui";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { saveCategoryAction, toggleCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Categorias" };

const r = (c: number | null) => (c != null ? String(c / 100) : "");

function CategoryForm({ c, parents }: { c?: typeof categories.$inferSelect; parents: (typeof categories.$inferSelect)[] }) {
  return (
    <form action={saveCategoryAction} className="grid gap-2 text-sm sm:grid-cols-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="sm:col-span-2">Nome<Input name="name" defaultValue={c?.name} required /></label>
      <label className="sm:col-span-2">Grupo da vitrine<Input name="group" defaultValue={c?.group ?? "Serviços especializados"} required /></label>
      <label>Ícone<Input name="icon" defaultValue={c?.icon ?? "sparkles"} /></label>
      <label>Ordem<Input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} /></label>
      <label className="sm:col-span-2">Subcategoria de
        <select name="parentId" defaultValue={c?.parentId ?? ""} className="w-full rounded-xl border border-line px-3 py-2.5">
          <option value="">— nenhuma —</option>
          {parents.filter((p) => p.id !== c?.id && !p.parentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label>R$/convidado mín.<Input name="estPerGuestMin" defaultValue={r(c?.estPerGuestMin ?? null)} inputMode="decimal" /></label>
      <label>R$/convidado máx.<Input name="estPerGuestMax" defaultValue={r(c?.estPerGuestMax ?? null)} inputMode="decimal" /></label>
      <label>Fixo mín. (R$)<Input name="estFixedMin" defaultValue={r(c?.estFixedMin ?? null)} inputMode="decimal" /></label>
      <label>Fixo máx. (R$)<Input name="estFixedMax" defaultValue={r(c?.estFixedMax ?? null)} inputMode="decimal" /></label>
      <label className="sm:col-span-5">Palavras-chave para a IA (separadas por vírgula)<Input name="aiKeywords" defaultValue={c?.aiKeywords.join(", ")} /></label>
      <div className="flex items-end"><Button size="sm" variant="dark" className="w-full">{c ? "Salvar" : "Criar"}</Button></div>
    </form>
  );
}

export default async function AdminCategories({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const list = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  return (
    <>
      <Flash {...sp} />
      <PageTitle title="Categorias" subtitle="Crie e organize categorias sem mexer no código. Os parâmetros de estimativa alimentam o planejamento da IA — são hipóteses iniciais a calibrar com propostas reais." />
      <details className="mb-6 rounded-2xl border border-line p-4" open={list.length === 0}>
        <summary className="cursor-pointer font-semibold">Nova categoria</summary>
        <div className="mt-3"><CategoryForm parents={list} /></div>
      </details>
      <ul className="space-y-3">
        {list.map((c) => (
          <li key={c.id} className={`rounded-2xl border border-line p-4 ${c.active ? "" : "opacity-60"}`}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <CategoryIcon name={c.icon} className="size-5" />
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-ink-soft">{c.group}{c.parentId && ` · sub de ${list.find((p) => p.id === c.parentId)?.name}`}</span>
                {!c.active && <Badge tone="red">Inativa</Badge>}
              </summary>
              <div className="mt-4 space-y-3">
                <CategoryForm c={c} parents={list} />
                <form action={toggleCategoryAction}><input type="hidden" name="id" value={c.id} /><Button size="sm" variant="ghost">{c.active ? "Desativar" : "Ativar"}</Button></form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
