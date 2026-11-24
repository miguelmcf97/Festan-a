import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, CategoryIcon, Input, PageTitle } from "@/components/ui";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { saveCategoryAction, toggleCategoryAction } from "../actions";
import { categoryName, groupName, makeT, type T } from "@/lib/i18n";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Categorias", "Categories") };
}

const r = (c: number | null) => (c != null ? String(c / 100) : "");

function CategoryForm({ c, parents, t = makeT("pt") }: { c?: typeof categories.$inferSelect; parents: (typeof categories.$inferSelect)[]; t?: T }) {
  return (
    <form action={saveCategoryAction} className="grid gap-2 text-sm sm:grid-cols-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="sm:col-span-2">{t("Nome (em português)", "Name (in Portuguese)")}<Input name="name" defaultValue={c?.name} required /></label>
      <label className="sm:col-span-2">{t("Grupo da vitrine", "Showcase group")}<Input name="group" defaultValue={c?.group ?? "Serviços especializados"} required /></label>
      <label>{t("Ícone", "Icon")}<Input name="icon" defaultValue={c?.icon ?? "sparkles"} /></label>
      <label>{t("Ordem", "Order")}<Input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} /></label>
      <label className="sm:col-span-2">{t("Subcategoria de", "Subcategory of")}
        <select name="parentId" defaultValue={c?.parentId ?? ""} className="w-full rounded-xl border border-line px-3 py-2.5">
          <option value="">{t("— nenhuma —", "— none —")}</option>
          {parents.filter((p) => p.id !== c?.id && !p.parentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label>{t("R$/convidado mín.", "R$/guest min.")}<Input name="estPerGuestMin" defaultValue={r(c?.estPerGuestMin ?? null)} inputMode="decimal" /></label>
      <label>{t("R$/convidado máx.", "R$/guest max.")}<Input name="estPerGuestMax" defaultValue={r(c?.estPerGuestMax ?? null)} inputMode="decimal" /></label>
      <label>{t("Fixo mín. (R$)", "Fixed min. (R$)")}<Input name="estFixedMin" defaultValue={r(c?.estFixedMin ?? null)} inputMode="decimal" /></label>
      <label>{t("Fixo máx. (R$)", "Fixed max. (R$)")}<Input name="estFixedMax" defaultValue={r(c?.estFixedMax ?? null)} inputMode="decimal" /></label>
      <label className="sm:col-span-5">{t("Palavras-chave para a IA (separadas por vírgula)", "Keywords for the AI (comma-separated)")}<Input name="aiKeywords" defaultValue={c?.aiKeywords.join(", ")} /></label>
      <div className="flex items-end"><Button size="sm" variant="dark" className="w-full">{c ? t("Salvar", "Save") : t("Criar", "Create")}</Button></div>
    </form>
  );
}

export default async function AdminCategories({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const list = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  return (
    <>
      <Flash {...sp} />
      <PageTitle title={t("Categorias", "Categories")} subtitle={t("Crie e organize categorias sem mexer no código. Os parâmetros de estimativa alimentam o planejamento da IA — são hipóteses iniciais a calibrar com propostas reais.", "Create and organize categories without touching code. The estimate parameters feed the AI plan — they are initial assumptions to calibrate with real proposals.")} />
      <details className="mb-6 rounded-2xl border border-line p-4" open={list.length === 0}>
        <summary className="cursor-pointer font-semibold">{t("Nova categoria", "New category")}</summary>
        <div className="mt-3"><CategoryForm parents={list} t={t} /></div>
      </details>
      <ul className="space-y-3">
        {list.map((c) => (
          <li key={c.id} className={`rounded-2xl border border-line p-4 ${c.active ? "" : "opacity-60"}`}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <CategoryIcon name={c.icon} className="size-5" />
                <span className="font-semibold">{categoryName(c, lang)}</span>
                <span className="text-sm text-ink-soft">{groupName(c.group, lang)}{c.parentId && ` · ${t("sub de", "sub of")} ${list.find((p) => p.id === c.parentId)?.name}`}</span>
                {!c.active && <Badge tone="red">{t("Inativa", "Inactive")}</Badge>}
              </summary>
              <div className="mt-4 space-y-3">
                <CategoryForm c={c} parents={list} t={t} />
                <form action={toggleCategoryAction}><input type="hidden" name="id" value={c.id} /><Button size="sm" variant="ghost">{c.active ? t("Desativar", "Disable") : t("Ativar", "Enable")}</Button></form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
