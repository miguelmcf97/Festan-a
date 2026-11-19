"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { EVENT_TYPE_LABEL } from "@/lib/format";
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
  const [eventId, setEventId] = useState(events[0]?.id ?? "new");
  if (state?.ok)
    return (
      <div className="space-y-3">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/painel" className="font-semibold text-pitanga">Acompanhar no meu painel</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="providerId" value={providerId} />
      <Field label="Serviço" htmlFor="q-cat">
        <Select id="q-cat" name="categoryId" required defaultValue={categories.length === 1 ? categories[0].id : ""}>
          {categories.length > 1 && <option value="">Escolha…</option>}
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Para qual evento?" htmlFor="q-ev">
        <Select id="q-ev" name="eventId" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          <option value="new">Um novo evento</option>
        </Select>
      </Field>
      {eventId === "new" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de evento" htmlFor="q-type">
            <Select id="q-type" name="type" required>
              {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Convidados" htmlFor="q-g"><Input id="q-g" name="guests" type="number" min={1} max={5000} required /></Field>
          <Field label="Data" htmlFor="q-d" hint="Deixe em branco se ainda não definiu"><Input id="q-d" name="date" type="date" /></Field>
          <Field label="Bairro ou cidade" htmlFor="q-l">
            <Select id="q-l" name="locationId">
              <option value="">A definir</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
      )}
      <Field label="Quanto pretende investir neste serviço? (opcional)" htmlFor="q-b"><Input id="q-b" name="budget" inputMode="decimal" placeholder="Ex.: 1.500" /></Field>
      <Field label="O que você precisa" htmlFor="q-desc"><Textarea id="q-desc" name="description" required placeholder="Ex.: festa infantil tema safari, das 15h às 19h, crianças de 4 a 8 anos…" /></Field>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação de orçamento"}</Button>
      <p className="text-xs text-ink-soft">Sem compromisso: o fornecedor responde com uma proposta, e você decide se aceita.</p>
    </form>
  );
}
