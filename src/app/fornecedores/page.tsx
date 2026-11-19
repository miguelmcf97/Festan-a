import type { Metadata } from "next";
import Link from "next/link";
import { ProviderCard } from "@/components/provider-card";
import { Button, EmptyState, Input, LinkButton, PageTitle, Select } from "@/components/ui";
import { listActiveCategories, listLocations, searchProviders } from "@/server/services/search";

export const metadata: Metadata = { title: "Fornecedores para festas no Rio" };
export const dynamic = "force-dynamic";

type SP = { categoria?: string; local?: string; data?: string; convidados?: string; q?: string; verificados?: string };

export default async function Fornecedores({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
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
  });
  const cat = cats.find((c) => c.slug === sp.categoria);
  const excludedTotal = res.excluded.outOfArea + res.excluded.unavailable + res.excluded.capacity;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <PageTitle
        title={cat ? cat.name : "Fornecedores"}
        subtitle="Empresas e profissionais aprovados pela Planfest na Região Metropolitana do Rio. Informe bairro e data para ver só quem atende você."
        actions={<LinkButton href="/planejar" variant="dark">Não sei o que contratar — planejar com IA</LinkButton>}
      />

      <form className="grid gap-3 rounded-2xl bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_0.8fr_auto]" role="search" aria-label="Filtrar fornecedores">
        <div>
          <label htmlFor="f-cat" className="text-xs font-semibold">Categoria</label>
          <Select id="f-cat" name="categoria" defaultValue={sp.categoria ?? ""}>
            <option value="">Todas</option>
            {[...new Set(cats.map((c) => c.group))].map((g) => (
              <optgroup key={g} label={g}>
                {cats.filter((c) => c.group === g).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-loc" className="text-xs font-semibold">Bairro ou cidade da festa</label>
          <Select id="f-loc" name="local" defaultValue={sp.local ?? ""}>
            <option value="">Qualquer lugar</option>
            {[...new Set(locs.map((l) => l.city))].map((city) => (
              <optgroup key={city} label={city}>
                {locs.filter((l) => l.city === city).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-date" className="text-xs font-semibold">Data</label>
          <Input id="f-date" name="data" type="date" defaultValue={date ?? ""} />
        </div>
        <div>
          <label htmlFor="f-g" className="text-xs font-semibold">Convidados</label>
          <Input id="f-g" name="convidados" type="number" min={1} max={5000} defaultValue={sp.convidados ?? ""} />
        </div>
        <div>
          <label htmlFor="f-q" className="text-xs font-semibold">Buscar</label>
          <Input id="f-q" name="q" defaultValue={sp.q ?? ""} placeholder="Nome ou termo" />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="verificados" value="1" defaultChecked={sp.verificados === "1"} className="accent-pitanga" />Só verificados</label>
          <Button type="submit" variant="dark" size="sm">Filtrar</Button>
        </div>
      </form>

      <p className="mt-5 text-sm text-ink-soft" aria-live="polite">
        {res.providers.length} {res.providers.length === 1 ? "fornecedor encontrado" : "fornecedores encontrados"}
        {excludedTotal > 0 && ` · ${excludedTotal} ocultos por área de atendimento, data ou capacidade`}
      </p>

      {res.providers.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nenhum fornecedor com esses filtros"
            body="Tente outra data, um bairro vizinho ou remova a categoria. Ainda estamos formando a rede de fornecedores em algumas regiões."
            action={<Link href="/fornecedores" className="font-semibold text-pitanga">Limpar filtros</Link>}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {res.providers.map((p) => (
            <ProviderCard
              key={p.id}
              p={p}
              action={<LinkButton href={`/fornecedores/${p.slug}#orcamento`} variant="outline" size="sm" className="w-full">Solicitar orçamento</LinkButton>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
