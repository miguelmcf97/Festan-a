import type { Metadata } from "next";
import Link from "next/link";
import { ProviderCard } from "@/components/provider-card";
import { Button, EmptyState, Input, LinkButton, PageTitle, Select } from "@/components/ui";
import { listActiveCategories, listLocations, searchProviders } from "@/server/services/search";
import { categoryName, groupName } from "@/lib/i18n";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Fornecedores para festas no Rio", "Party vendors in Rio") };
}
export const dynamic = "force-dynamic";

type SP = { categoria?: string; local?: string; data?: string; convidados?: string; q?: string; verificados?: string };

export default async function Fornecedores({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const [cats, locs] = await Promise.all([listActiveCategories(), listLocations()]);
  const guests = sp.convidados ? Number.parseInt(sp.convidados, 10) : null;
  const date = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : null;
  const res = await searchProviders({
    categorySlugs: sp.categoria ? [sp.categoria] : undefined,
    locationId: sp.local || null,
    date,
    guests: guests && guests > 0 ? guests : null,
    query: sp.q,
    verifiedOnly: sp.verificados === "1",
    limit: 50,
    lang,
  });
  const cat = cats.find((c) => c.slug === sp.categoria);
  const excludedTotal = res.excluded.outOfArea + res.excluded.unavailable + res.excluded.capacity;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <PageTitle
        title={cat ? categoryName(cat, lang) : t("Fornecedores", "Vendors")}
        subtitle={t("Empresas e profissionais aprovados pela Planfest na Região Metropolitana do Rio. Informe bairro e data para ver só quem atende você.", "Businesses and professionals approved by Planfest in the Rio de Janeiro metro area. Enter a neighborhood and date to see only those who can serve you.")}
        actions={<LinkButton href="/planejar" variant="dark">{t("Não sei o que contratar — planejar com IA", "Not sure what to book — plan with AI")}</LinkButton>}
      />

      <form className="grid gap-3 rounded-2xl bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_0.8fr_auto]" role="search" aria-label={t("Filtrar fornecedores", "Filter vendors")}>
        <div>
          <label htmlFor="f-cat" className="text-xs font-semibold">{t("Categoria", "Category")}</label>
          <Select id="f-cat" name="categoria" defaultValue={sp.categoria ?? ""}>
            <option value="">{t("Todas", "All")}</option>
            {[...new Set(cats.map((c) => c.group))].map((g) => (
              <optgroup key={g} label={groupName(g, lang)}>
                {cats.filter((c) => c.group === g).map((c) => <option key={c.slug} value={c.slug}>{categoryName(c, lang)}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-loc" className="text-xs font-semibold">{t("Bairro ou cidade da festa", "Party neighborhood or city")}</label>
          <Select id="f-loc" name="local" defaultValue={sp.local ?? ""}>
            <option value="">{t("Qualquer lugar", "Anywhere")}</option>
            {[...new Set(locs.map((l) => l.city))].map((city) => (
              <optgroup key={city} label={city}>
                {locs.filter((l) => l.city === city).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-date" className="text-xs font-semibold">{t("Data", "Date")}</label>
          <Input id="f-date" name="data" type="date" defaultValue={date ?? ""} />
        </div>
        <div>
          <label htmlFor="f-g" className="text-xs font-semibold">{t("Convidados", "Guests")}</label>
          <Input id="f-g" name="convidados" type="number" min={1} max={5000} defaultValue={sp.convidados ?? ""} />
        </div>
        <div>
          <label htmlFor="f-q" className="text-xs font-semibold">{t("Buscar", "Search")}</label>
          <Input id="f-q" name="q" defaultValue={sp.q ?? ""} placeholder={t("Nome ou termo", "Name or keyword")} />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="verificados" value="1" defaultChecked={sp.verificados === "1"} className="accent-pitanga" />{t("Só verificados", "Verified only")}</label>
          <Button type="submit" variant="dark" size="sm">{t("Filtrar", "Filter")}</Button>
        </div>
      </form>

      <p className="mt-5 text-sm text-ink-soft" aria-live="polite">
        {res.providers.length} {res.providers.length === 1 ? t("fornecedor encontrado", "vendor found") : t("fornecedores encontrados", "vendors found")}
        {excludedTotal > 0 && ` · ${excludedTotal} ${t("ocultos por área de atendimento, data ou capacidade", "hidden by service area, date or capacity")}`}
      </p>

      {res.providers.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={t("Nenhum fornecedor com esses filtros", "No vendors match these filters")}
            body={t("Tente outra data, um bairro vizinho ou remova a categoria. Ainda estamos formando a rede de fornecedores em algumas regiões.", "Try another date, a nearby neighborhood or remove the category. We are still building the vendor network in some areas.")}
            action={<Link href="/fornecedores" className="font-semibold text-pitanga">{t("Limpar filtros", "Clear filters")}</Link>}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {res.providers.map((p) => (
            <ProviderCard
              key={p.id}
              p={p}
              action={<LinkButton href={`/fornecedores/${p.slug}#orcamento`} variant="outline" size="sm" className="w-full">{t("Solicitar orçamento", "Request a quote")}</LinkButton>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
