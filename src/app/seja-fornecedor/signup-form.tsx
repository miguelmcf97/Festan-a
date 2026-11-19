"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { providerSignupAction } from "./actions";

export function ProviderSignupForm({
  categories,
  locations,
  loggedIn,
}: {
  categories: { id: string; name: string; group: string }[];
  locations: { id: string; label: string }[];
  loggedIn: boolean;
}) {
  const [state, action, pending] = useActionState(providerSignupAction, undefined);
  const fe = state?.fieldErrors ?? {};
  const groups = [...new Set(categories.map((c) => c.group))];
  return (
    <form action={action} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">Você</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do responsável" htmlFor="rn" error={fe.responsibleName}><Input id="rn" name="responsibleName" autoComplete="name" required /></Field>
          <Field label="E-mail" htmlFor="em" error={fe.email}><Input id="em" name="email" type="email" autoComplete="email" required /></Field>
          {!loggedIn && <Field label="Senha de acesso" htmlFor="pw" error={fe.password} hint="Mínimo de 8 caracteres"><Input id="pw" name="password" type="password" autoComplete="new-password" minLength={8} /></Field>}
          <Field label="Telefone com DDD" htmlFor="ph" error={fe.phone}><Input id="ph" name="phone" type="tel" required /></Field>
          <Field label="WhatsApp" htmlFor="wa"><Input id="wa" name="whatsapp" type="tel" /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">Sua empresa</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da empresa ou nome profissional" htmlFor="tn" error={fe.tradeName}><Input id="tn" name="tradeName" required /></Field>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Tipo" htmlFor="dt"><Select id="dt" name="docType"><option value="CNPJ">CNPJ</option><option value="CPF">CPF</option></Select></Field>
            <Field label="Número" htmlFor="dc" error={fe.document} hint="Usado só na verificação, nunca exibido"><Input id="dc" name="document" inputMode="numeric" required /></Field>
          </div>
          <div className="sm:col-span-2"><Field label="Descreva seu trabalho" htmlFor="ds" error={fe.description}><Textarea id="ds" name="description" rows={4} required placeholder="O que você oferece, para quais tipos de festa, diferenciais, o que está incluso…" /></Field></div>
          <Field label="Preço a partir de (R$, opcional)" htmlFor="pm" hint="Ajuda a IA a indicar você para o orçamento certo"><Input id="pm" name="priceMin" inputMode="decimal" /></Field>
          <Field label="Atende até quantos convidados? (opcional)" htmlFor="mg"><Input id="mg" name="maxGuests" type="number" min={0} /></Field>
        </div>
        <div>
          <p className="text-sm font-semibold">Categorias</p>
          {fe.categories && <p className="text-xs font-medium text-pitanga-dark">{fe.categories}</p>}
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g}>
                <p className="text-xs font-semibold text-ink-soft">{g}</p>
                {categories.filter((c) => c.group === g).map((c) => (
                  <label key={c.id} className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" name="categories" value={c.id} className="accent-pitanga" />{c.name}</label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">Onde você atende</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bairro ou cidade base" htmlFor="lc" error={fe.locationId}>
            <Select id="lc" name="locationId" required defaultValue="">
              <option value="" disabled>Escolha…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="Raio de atendimento (km)" htmlFor="rk"><Input id="rk" name="serviceRadiusKm" type="number" min={1} max={150} defaultValue={25} /></Field>
        </div>
      </fieldset>

      <label className="flex gap-2.5 text-sm">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-pitanga" required />
        <span>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold underline">termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold underline">política de privacidade</Link>.</span>
      </label>
      {fe.consent && <p className="text-xs font-medium text-pitanga-dark">{fe.consent}</p>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {Object.keys(fe).length > 0 && <Alert tone="error">Revise os campos destacados.</Alert>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Enviando…" : "Enviar cadastro para análise"}</Button>
    </form>
  );
}
