import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Button, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { formatDate, formatRange } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { availability, services } from "@/server/db/schema";
import { myProvider } from "@/server/services/providers";
import { listActiveCategories, listLocations } from "@/server/services/search";
import { addServiceAction, blockDateAction, removeServiceAction, unblockDateAction, updateProfileAction } from "../actions";

export const metadata: Metadata = { title: "Perfil, serviços e agenda" };

export default async function ProviderProfile({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser(["PROVIDER"], "/fornecedor/perfil");
  const p = await myProvider(user.id);
  if (!p) return null;
  const [cats, locs, svcs, dates] = await Promise.all([
    listActiveCategories(),
    listLocations(),
    db.query.services.findMany({ where: and(eq(services.providerId, p.id), eq(services.active, true)), with: { category: true } }),
    db.query.availability.findMany({ where: and(eq(availability.providerId, p.id), gte(availability.date, new Date().toISOString().slice(0, 10))), orderBy: asc(availability.date) }),
  ]);
  const sp = await searchParams;
  const mine = new Set(p.categories.map((c) => c.categoryId));
  const reais = (c: number | null) => (c != null ? String(c / 100) : "");

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <Link href="/fornecedor" className="text-sm font-semibold text-ink-soft hover:text-ink">← Painel</Link>
      <h1 className="mt-2 text-3xl font-bold">Perfil, serviços e agenda</h1>
      <p className="mb-6 text-ink-soft">Quanto mais completo e atualizado, mais vezes você aparece nas recomendações da IA.</p>
      <Flash {...sp} />

      <Panel>
        <h2 className="text-xl font-bold">Dados da empresa</h2>
        <form action={updateProfileAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nome fantasia" htmlFor="tn"><Input id="tn" name="tradeName" defaultValue={p.tradeName} required /></Field>
          <Field label="Frase curta" htmlFor="sp"><Input id="sp" name="shortPitch" defaultValue={p.shortPitch ?? ""} maxLength={120} /></Field>
          <div className="sm:col-span-2"><Field label="Descrição" htmlFor="ds"><Textarea id="ds" name="description" defaultValue={p.description} required rows={5} /></Field></div>
          <Field label="Telefone" htmlFor="ph"><Input id="ph" name="phone" defaultValue={p.phone} required /></Field>
          <Field label="WhatsApp" htmlFor="wa"><Input id="wa" name="whatsapp" defaultValue={p.whatsapp ?? ""} /></Field>
          <Field label="E-mail comercial" htmlFor="em"><Input id="em" name="email" type="email" defaultValue={p.email} required /></Field>
          <Field label="Bairro base" htmlFor="lc">
            <Select id="lc" name="locationId" defaultValue={p.locationId}>
              {locs.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.city})</option>)}
            </Select>
          </Field>
          <Field label="Raio de atendimento (km)" htmlFor="rk"><Input id="rk" name="serviceRadiusKm" type="number" min={1} max={150} defaultValue={p.serviceRadiusKm} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mín. convidados" htmlFor="mg"><Input id="mg" name="minGuests" type="number" min={0} defaultValue={p.minGuests ?? ""} /></Field>
            <Field label="Máx. convidados" htmlFor="xg"><Input id="xg" name="maxGuests" type="number" min={0} defaultValue={p.maxGuests ?? ""} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço a partir de (R$)" htmlFor="pm"><Input id="pm" name="priceMin" inputMode="decimal" defaultValue={reais(p.priceMin)} /></Field>
            <Field label="Até (R$)" htmlFor="px"><Input id="px" name="priceMax" inputMode="decimal" defaultValue={reais(p.priceMax)} /></Field>
          </div>
          <Field label="Observação de preço" htmlFor="pn" hint="Ex.: pacote 4h, por pessoa…"><Input id="pn" name="priceNote" defaultValue={p.priceNote ?? ""} /></Field>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold">Categorias</legend>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {cats.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="categories" value={c.id} defaultChecked={mine.has(c.id)} className="accent-pitanga" />{c.name}</label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2"><Button>Salvar perfil</Button></div>
        </form>
      </Panel>

      <Panel className="mt-6">
        <h2 className="text-xl font-bold">Serviços e produtos</h2>
        <ul className="mt-3 divide-y divide-line">
          {svcs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div><p className="font-semibold">{s.name}</p><p className="text-sm text-ink-soft">{s.category.name} · {s.priceType === "ON_REQUEST" ? "sob consulta" : formatRange(s.priceMin, s.priceMax)}</p></div>
              <form action={removeServiceAction}><input type="hidden" name="serviceId" value={s.id} /><Button size="sm" variant="ghost">Remover</Button></form>
            </li>
          ))}
        </ul>
        <form action={addServiceAction} className="mt-4 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="sn"><Input id="sn" name="name" required placeholder="Ex.: Pacote festa infantil 4h" /></Field>
          <Field label="Categoria" htmlFor="sc">
            <Select id="sc" name="categoryId">{p.categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.category.name}</option>)}</Select>
          </Field>
          <Field label="Tipo" htmlFor="sk"><Select id="sk" name="kind"><option value="SERVICE">Serviço</option><option value="PRODUCT">Produto</option></Select></Field>
          <Field label="Preço" htmlFor="st">
            <Select id="st" name="priceType"><option value="FROM">A partir de</option><option value="FIXED">Valor fixo</option><option value="PER_PERSON">Por pessoa</option><option value="ON_REQUEST">Sob consulta</option></Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor mín. (R$)" htmlFor="smin"><Input id="smin" name="priceMin" inputMode="decimal" /></Field>
            <Field label="Valor máx. (R$)" htmlFor="smax"><Input id="smax" name="priceMax" inputMode="decimal" /></Field>
          </div>
          <Field label="Descrição" htmlFor="sd"><Input id="sd" name="description" /></Field>
          <div className="sm:col-span-2"><Button size="sm" variant="dark">Adicionar serviço</Button></div>
        </form>
      </Panel>

      <Panel className="mt-6">
        <h2 className="text-xl font-bold">Agenda</h2>
        <p className="text-sm text-ink-soft">Bloqueie as datas em que não pode atender. Datas de contratações confirmadas são bloqueadas automaticamente.</p>
        <form action={blockDateAction} className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Data" htmlFor="bd"><Input id="bd" name="date" type="date" min={new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Observação" htmlFor="bn"><Input id="bn" name="note" placeholder="Opcional" /></Field>
          <Button size="sm" variant="dark">Bloquear data</Button>
        </form>
        <ul className="mt-4 divide-y divide-line">
          {dates.length === 0 && <li className="py-2 text-sm text-ink-soft">Nenhuma data bloqueada.</li>}
          {dates.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span>{formatDate(d.date)} · {d.status === "BOOKED" ? "Contratação confirmada" : "Bloqueada"}{d.note && ` · ${d.note}`}</span>
              {d.status === "BLOCKED" && <form action={unblockDateAction}><input type="hidden" name="id" value={d.id} /><Button size="sm" variant="ghost">Liberar</Button></form>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
