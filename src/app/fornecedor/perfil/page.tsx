import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { Flash } from "@/components/status";
import { Alert, Button, Field, Input, LinkButton, Panel, Select, Textarea } from "@/components/ui";
import { formatRange } from "@/lib/format";
import { categoryName, groupName } from "@/lib/i18n";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { services } from "@/server/db/schema";
import { getT } from "@/server/i18n";
import { myProvider } from "@/server/services/providers";
import { listActiveCategories, listLocations } from "@/server/services/search";
import { addServiceAction, removeServiceAction, updateProfileAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Perfil e serviços", "Profile and services") };
}

export default async function ProviderProfile({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser(["PROVIDER"], "/fornecedor/perfil");
  const p = await myProvider(user.id);
  if (!p) return null;
  const { lang, t } = await getT();
  const [cats, locs, svcs] = await Promise.all([
    listActiveCategories(),
    listLocations(),
    db.query.services.findMany({ where: and(eq(services.providerId, p.id), eq(services.active, true)), with: { category: true } }),
  ]);
  const sp = await searchParams;
  const current = p.categories[0]?.category ?? null;
  const groups = [...new Set(cats.map((c) => c.group))];
  const reais = (c: number | null) => (c != null ? String(c / 100) : "");

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <Link href="/fornecedor" className="text-sm font-semibold text-ink-soft hover:text-ink">← {t("Painel", "Dashboard")}</Link>
      <h1 className="mt-2 text-3xl font-bold">{t("Perfil e serviços", "Profile and services")}</h1>
      <p className="mb-6 text-ink-soft">{t("Quanto mais completo e atualizado, mais vezes você aparece nas recomendações da IA.", "The more complete and up to date, the more often the AI recommends you.")}</p>
      <Flash {...sp} />

      <Link href="/fornecedor/agenda" className="mb-6 flex items-center gap-4 rounded-2xl border border-line p-4 hover:border-ink">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pitanga-soft text-pitanga"><CalendarDays className="size-5" aria-hidden /></span>
        <span className="flex-1">
          <span className="block font-bold">{t("Agenda", "Calendar")}</span>
          <span className="block text-sm text-ink-soft">{t("Veja datas livres, bloqueadas e fechadas e bloqueie dias com um toque.", "See open, blocked and booked dates and block days with one tap.")}</span>
        </span>
      </Link>

      <Panel>
        <h2 className="text-xl font-bold">{t("Dados da empresa", "Business details")}</h2>
        <form action={updateProfileAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("Nome fantasia", "Business name")} htmlFor="tn"><Input id="tn" name="tradeName" defaultValue={p.tradeName} required /></Field>
          <Field label={t("Frase curta", "Short tagline")} htmlFor="sp"><Input id="sp" name="shortPitch" defaultValue={p.shortPitch ?? ""} maxLength={120} /></Field>
          <div className="sm:col-span-2"><Field label={t("Descrição", "Description")} htmlFor="ds"><Textarea id="ds" name="description" defaultValue={p.description} required rows={5} /></Field></div>
          <Field label={t("Telefone", "Phone")} htmlFor="ph"><Input id="ph" name="phone" defaultValue={p.phone} required /></Field>
          <Field label="WhatsApp" htmlFor="wa"><Input id="wa" name="whatsapp" defaultValue={p.whatsapp ?? ""} /></Field>
          <Field label={t("E-mail comercial", "Business email")} htmlFor="em"><Input id="em" name="email" type="email" defaultValue={p.email} required /></Field>
          <Field label={t("Bairro base", "Base neighborhood")} htmlFor="lc">
            <Select id="lc" name="locationId" defaultValue={p.locationId}>
              {locs.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.city})</option>)}
            </Select>
          </Field>
          <Field label={t("Raio de atendimento (km)", "Service radius (km)")} htmlFor="rk"><Input id="rk" name="serviceRadiusKm" type="number" min={1} max={150} defaultValue={p.serviceRadiusKm} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Mín. convidados", "Min. guests")} htmlFor="mg"><Input id="mg" name="minGuests" type="number" min={0} defaultValue={p.minGuests ?? ""} /></Field>
            <Field label={t("Máx. convidados", "Max. guests")} htmlFor="xg"><Input id="xg" name="maxGuests" type="number" min={0} defaultValue={p.maxGuests ?? ""} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Preço a partir de (R$)", "Price from (R$)")} htmlFor="pm"><Input id="pm" name="priceMin" inputMode="decimal" defaultValue={reais(p.priceMin)} /></Field>
            <Field label={t("Até (R$)", "Up to (R$)")} htmlFor="px"><Input id="px" name="priceMax" inputMode="decimal" defaultValue={reais(p.priceMax)} /></Field>
          </div>
          <Field label={t("Observação de preço", "Price note")} htmlFor="pn" hint={t("Ex.: pacote 4h, por pessoa…", "E.g. 4-hour package, per person…")}><Input id="pn" name="priceNote" defaultValue={p.priceNote ?? ""} /></Field>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold">{t("Categoria do seu serviço", "Your service category")}</legend>
            <p className="text-xs text-ink-soft">
              {t(
                "Cada fornecedor atua em uma categoria. Se você trocar, os serviços da categoria anterior saem do ar.",
                "Each vendor works in one category. If you change it, services from the previous category are taken down.",
              )}
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g}>
                  <p className="text-xs font-semibold text-ink-soft">{groupName(g, lang)}</p>
                  {cats.filter((c) => c.group === g).map((c) => (
                    <label key={c.id} className="mt-1 flex items-center gap-2 text-sm">
                      <input type="radio" name="categoryId" value={c.id} defaultChecked={current?.id === c.id} required className="accent-pitanga" />
                      {categoryName(c, lang)}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2"><Button>{t("Salvar perfil", "Save profile")}</Button></div>
        </form>
      </Panel>

      <Panel className="mt-6">
        <h2 className="text-xl font-bold">{t("Serviços e produtos", "Services and products")}</h2>
        {current ? (
          <p className="text-sm text-ink-soft">{t("Todos os serviços ficam na sua categoria:", "All services belong to your category:")} <strong className="text-ink">{categoryName(current, lang)}</strong></p>
        ) : (
          <div className="mt-2"><Alert tone="warn">{t("Escolha a categoria do seu serviço no perfil antes de cadastrar serviços.", "Choose your service category in the profile before adding services.")}</Alert></div>
        )}
        <ul className="mt-3 divide-y divide-line">
          {svcs.length === 0 && <li className="py-2 text-sm text-ink-soft">{t("Nenhum serviço cadastrado ainda.", "No services yet.")}</li>}
          {svcs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-ink-soft">{s.priceType === "ON_REQUEST" ? t("sob consulta", "on request") : formatRange(s.priceMin, s.priceMax, lang)}</p>
              </div>
              <form action={removeServiceAction}><input type="hidden" name="serviceId" value={s.id} /><Button size="sm" variant="ghost">{t("Remover", "Remove")}</Button></form>
            </li>
          ))}
        </ul>
        {current && (
          <form action={addServiceAction} className="mt-4 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-2">
            <Field label={t("Nome", "Name")} htmlFor="sn"><Input id="sn" name="name" required placeholder={t("Ex.: Pacote festa infantil 4h", "E.g. 4-hour kids' party package")} /></Field>
            <Field label={t("Tipo", "Type")} htmlFor="sk"><Select id="sk" name="kind"><option value="SERVICE">{t("Serviço", "Service")}</option><option value="PRODUCT">{t("Produto", "Product")}</option></Select></Field>
            <Field label={t("Preço", "Price")} htmlFor="st">
              <Select id="st" name="priceType">
                <option value="FROM">{t("A partir de", "Starting at")}</option>
                <option value="FIXED">{t("Valor fixo", "Fixed price")}</option>
                <option value="PER_PERSON">{t("Por pessoa", "Per person")}</option>
                <option value="ON_REQUEST">{t("Sob consulta", "On request")}</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Valor mín. (R$)", "Min. price (R$)")} htmlFor="smin"><Input id="smin" name="priceMin" inputMode="decimal" /></Field>
              <Field label={t("Valor máx. (R$)", "Max. price (R$)")} htmlFor="smax"><Input id="smax" name="priceMax" inputMode="decimal" /></Field>
            </div>
            <div className="sm:col-span-2"><Field label={t("Descrição", "Description")} htmlFor="sd"><Input id="sd" name="description" /></Field></div>
            <div className="sm:col-span-2"><Button size="sm" variant="dark">{t("Adicionar serviço", "Add service")}</Button></div>
          </form>
        )}
      </Panel>

      <div className="mt-6 flex justify-end">
        <LinkButton href={`/fornecedores/${p.slug}`} variant="outline" size="sm">{t("Ver perfil público", "View public profile")}</LinkButton>
      </div>
    </div>
  );
}
