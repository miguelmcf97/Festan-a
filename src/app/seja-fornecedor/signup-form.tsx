"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { providerSignupAction } from "./actions";
import { useLang } from "@/components/i18n-client";
import { categoryName, groupName } from "@/lib/i18n";
import { msg } from "@/lib/messages-en";

export function ProviderSignupForm({
  categories,
  locations,
  loggedIn,
}: {
  categories: { id: string; slug: string; name: string; group: string }[];
  locations: { id: string; label: string }[];
  loggedIn: boolean;
}) {
  const [state, action, pending] = useActionState(providerSignupAction, undefined);
  const { lang, t } = useLang();
  const fe = Object.fromEntries(Object.entries(state?.fieldErrors ?? {}).map(([k, v]) => [k, msg(v, lang)]));
  const groups = [...new Set(categories.map((c) => c.group))];
  return (
    <form action={action} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">{t("Você", "You")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Nome do responsável", "Contact person")} htmlFor="rn" error={fe.responsibleName}><Input id="rn" name="responsibleName" autoComplete="name" required /></Field>
          <Field label={t("E-mail", "Email")} htmlFor="em" error={fe.email}><Input id="em" name="email" type="email" autoComplete="email" required /></Field>
          {!loggedIn && <Field label={t("Senha de acesso", "Password")} htmlFor="pw" error={fe.password} hint={t("Mínimo de 8 caracteres", "At least 8 characters")}><Input id="pw" name="password" type="password" autoComplete="new-password" minLength={8} /></Field>}
          <Field label={t("Telefone com DDD", "Phone with area code")} htmlFor="ph" error={fe.phone}><Input id="ph" name="phone" type="tel" required /></Field>
          <Field label="WhatsApp" htmlFor="wa"><Input id="wa" name="whatsapp" type="tel" /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">{t("Sua empresa", "Your business")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Nome da empresa ou nome profissional", "Business or professional name")} htmlFor="tn" error={fe.tradeName}><Input id="tn" name="tradeName" required /></Field>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label={t("Tipo", "Type")} htmlFor="dt"><Select id="dt" name="docType"><option value="CNPJ">CNPJ</option><option value="CPF">CPF</option></Select></Field>
            <Field label={t("Número", "Number")} htmlFor="dc" error={fe.document} hint={t("Usado só na verificação, nunca exibido", "Used only for verification, never shown")}><Input id="dc" name="document" inputMode="numeric" required /></Field>
          </div>
          <div className="sm:col-span-2"><Field label={t("Descreva seu trabalho", "Describe your work")} htmlFor="ds" error={fe.description}><Textarea id="ds" name="description" rows={4} required placeholder={t("O que você oferece, para quais tipos de festa, diferenciais, o que está incluso…", "What you offer, for which kinds of party, what sets you apart, what is included…")} /></Field></div>
          <Field label={t("Preço a partir de (R$, opcional)", "Price from (R$, optional)")} htmlFor="pm" hint={t("Ajuda a IA a indicar você para o orçamento certo", "Helps the AI recommend you for the right budget")}><Input id="pm" name="priceMin" inputMode="decimal" /></Field>
          <Field label={t("Atende até quantos convidados? (opcional)", "Up to how many guests? (optional)")} htmlFor="mg"><Input id="mg" name="maxGuests" type="number" min={0} /></Field>
        </div>
        <div>
          <p className="text-sm font-semibold" id="cat-label">{t("Categoria do seu serviço", "Your service category")}</p>
          <p className="text-xs text-ink-soft">{t("Escolha uma. Cada fornecedor atua em uma única categoria.", "Pick one. Each vendor works in a single category.")}</p>
          {fe.categories && <p className="text-xs font-medium text-pitanga-dark">{fe.categories}</p>}
          <div className="mt-2 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-labelledby="cat-label">
            {groups.map((g) => (
              <div key={g}>
                <p className="text-xs font-semibold text-ink-soft">{groupName(g, lang)}</p>
                {categories.filter((c) => c.group === g).map((c) => (
                  <label key={c.id} className="mt-1 flex items-center gap-2 text-sm"><input type="radio" name="categoryId" value={c.id} required className="accent-pitanga" />{categoryName(c, lang)}</label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">{t("Onde você atende", "Where you work")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Bairro ou cidade base", "Base neighborhood or city")} htmlFor="lc" error={fe.locationId}>
            <Select id="lc" name="locationId" required defaultValue="">
              <option value="" disabled>{t("Escolha…", "Choose…")}</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label={t("Raio de atendimento (km)", "Service radius (km)")} htmlFor="rk"><Input id="rk" name="serviceRadiusKm" type="number" min={1} max={150} defaultValue={25} /></Field>
        </div>
      </fieldset>

      <label className="flex gap-2.5 text-sm">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-pitanga" required />
        <span>{t("Li e aceito os", "I have read and accept the")} <Link href="/termos" target="_blank" className="font-semibold underline">{t("termos de uso", "terms of use")}</Link> {t("e a", "and the")} <Link href="/privacidade" target="_blank" className="font-semibold underline">{t("política de privacidade", "privacy policy")}</Link>.</span>
      </label>
      {fe.consent && <p className="text-xs font-medium text-pitanga-dark">{fe.consent}</p>}
      {state?.error && <Alert tone="error">{msg(state.error, lang)}</Alert>}
      {Object.keys(fe).length > 0 && <Alert tone="error">{t("Revise os campos destacados.", "Check the highlighted fields.")}</Alert>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? t("Enviando…", "Sending…") : t("Enviar cadastro para análise", "Submit for review")}</Button>
    </form>
  );
}
