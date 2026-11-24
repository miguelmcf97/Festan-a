"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { eventTypeOptions } from "@/lib/format";
import { msg } from "@/lib/messages-en";
import { useLang } from "@/components/i18n-client";
import { directQuoteAction } from "./actions";

export function QuoteForm({
  providerId,
  categories,
  events,
  locations,
}: {
  providerId: string;
  categories: { id: string; name: string }[];
  events: { id: string; title: string }[];
  locations: { id: string; label: string; city: string }[];
}) {
  const [state, action, pending] = useActionState(directQuoteAction, undefined);
  const { lang, t } = useLang();
  const [eventId, setEventId] = useState(events[0]?.id ?? "new");
  if (state?.ok)
    return (
      <div className="space-y-3">
        <Alert tone="success">{msg(state.message, lang)}</Alert>
        <Link href="/painel" className="font-semibold text-pitanga">{t("Acompanhar no meu painel", "Track it in my dashboard")}</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="providerId" value={providerId} />
      <Field label={t("Serviço", "Service")} htmlFor="q-cat">
        <Select id="q-cat" name="categoryId" required defaultValue={categories.length === 1 ? categories[0].id : ""}>
          {categories.length > 1 && <option value="">{t("Escolha…", "Choose…")}</option>}
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={t("Para qual evento?", "For which event?")} htmlFor="q-ev">
        <Select id="q-ev" name="eventId" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          <option value="new">{t("Um novo evento", "A new event")}</option>
        </Select>
      </Field>
      {eventId === "new" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Tipo de evento", "Event type")} htmlFor="q-type">
            <Select id="q-type" name="type" required>
              {eventTypeOptions(lang).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label={t("Convidados", "Guests")} htmlFor="q-g"><Input id="q-g" name="guests" type="number" min={1} max={5000} required /></Field>
          <Field label={t("Data", "Date")} htmlFor="q-d" hint={t("Deixe em branco se ainda não definiu", "Leave blank if not decided yet")}><Input id="q-d" name="date" type="date" /></Field>
          <Field label={t("Bairro ou cidade", "Neighborhood or city")} htmlFor="q-l">
            <Select id="q-l" name="locationId">
              <option value="">{t("A definir", "To be defined")}</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
      )}
      <Field label={t("Quanto pretende investir neste serviço? (opcional)", "How much do you plan to spend on this service? (optional)")} htmlFor="q-b"><Input id="q-b" name="budget" inputMode="decimal" placeholder={t("Ex.: 1.500", "E.g. 1500")} /></Field>
      <Field label={t("O que você precisa", "What you need")} htmlFor="q-desc"><Textarea id="q-desc" name="description" required placeholder={t("Ex.: festa infantil tema safari, das 15h às 19h, crianças de 4 a 8 anos…", "E.g. safari-themed kids’ party, 3pm to 7pm, children aged 4 to 8…")} /></Field>
      {state?.error && <Alert tone="error">{msg(state.error, lang)}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? t("Enviando…", "Sending…") : t("Enviar solicitação de orçamento", "Send quote request")}</Button>
      <p className="text-xs text-ink-soft">{t("Sem compromisso: o fornecedor responde com uma proposta, e você decide se aceita.", "No commitment: the vendor replies with a proposal and you decide whether to accept.")}</p>
    </form>
  );
}
