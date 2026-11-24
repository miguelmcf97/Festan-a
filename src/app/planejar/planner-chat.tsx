"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Check, MapPin, PiggyBank, Plus, Send, TriangleAlert, Users, Wallet, X } from "lucide-react";
import { ProviderCard } from "@/components/provider-card";
import { Alert, Button, CategoryIcon, LinkButton, Textarea } from "@/components/ui";
import { eventTypeLabel, formatBRL, formatDate, priorityLabel } from "@/lib/format";
import { categoryName, type T } from "@/lib/i18n";
import { useLang } from "@/components/i18n-client";
import type { AiUsage } from "@/server/services/ai-usage";
import type { ChatOutput } from "@/server/ai/agent";
import type { UiPayload } from "@/server/ai/tools";
import type { ProviderCard as Card } from "@/server/services/search";
import { eventBriefAction, requestQuotesAction } from "./actions";

type Msg = { id: string; role: "user" | "assistant"; content: string; ui?: UiPayload | null };
type Plan = ChatOutput["plan"];
type EventSnap = ChatOutput["event"];
type Selected = { provider: Card; categorySlug: string; categoryName: string; budget: number | null };

export function PlannerChat({
  initialQuery,
  initial,
  user,
  engineNotice,
  initialUsage,
}: {
  initialQuery: string | null;
  initial: { conversationId: string; eventId: string; messages: Msg[]; event: EventSnap; plan: Plan } | null;
  user: { name: string; role: string } | null;
  engineNotice: string | null;
  initialUsage: AiUsage;
}) {
  const { lang, t } = useLang();
  const [usage, setUsage] = useState<AiUsage>(initialUsage);
  const limitReached = usage.remaining !== null && usage.remaining <= 0;
  const [messages, setMessages] = useState<Msg[]>(initial?.messages ?? []);
  const [conversationId, setConversationId] = useState<string | null>(initial?.conversationId ?? null);
  const [eventId, setEventId] = useState<string | null>(initial?.eventId ?? null);
  const [event, setEvent] = useState<EventSnap | null>(initial?.event ?? null);
  const [plan, setPlan] = useState<Plan>(initial?.plan ?? null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, Selected>>(new Map());
  const [dialog, setDialog] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || sending || limitReached) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: msg }]);
    setSending(true);
    setStatus("reading");
    setLiveText("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ message: msg, conversationId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (data.usage) setUsage(data.usage);
        if (data.code === "AI_LIMIT") setMessages((m) => m.slice(0, -1));
        throw new Error(data.error ?? t("Não foi possível enviar a mensagem.", "Could not send the message."));
      }
      // Lê os eventos linha a linha: status, trechos de texto, resultado final
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let out: ChatOutput | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "status") setStatus(ev.code);
          else if (ev.type === "text") setLiveText((t) => t + ev.delta);
          else if (ev.type === "reset") setLiveText("");
          else if (ev.type === "error") throw new Error(ev.error);
          else if (ev.type === "done") out = ev.data as ChatOutput;
        }
      }
      if (!out) throw new Error(t("A resposta foi interrompida. Tente de novo.", "The reply was interrupted. Please try again."));
      const final = out;
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: final.reply, ui: final.ui }]);
      setConversationId(final.conversationId);
      setEventId(final.eventId);
      setEvent(final.event);
      setPlan(final.plan);
      if (final.usage) setUsage(final.usage);
      if (!conversationId) window.history.replaceState(null, "", `/planejar?c=${final.conversationId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
      setLiveText("");
      setStatus(null);
    }
  }

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true;
      void send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const budgetFor = (slug: string) => plan?.items.find((i) => i.slug === slug)?.allocated ?? null;
  const toggle = (p: Card, slug: string, name: string) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, { provider: p, categorySlug: slug, categoryName: name, budget: budgetFor(slug) });
      return next;
    });

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-[70dvh] flex-col" aria-label={t("Conversa com a assistente de planejamento", "Conversation with the planning assistant")}>
        <div className="mb-4">
          <h1 className="text-3xl font-bold">{t("Planejar com IA", "Plan with AI")}</h1>
          <p className="text-ink-soft">{t("Conte como você imagina a festa. Os valores são estimativas; preços reais vêm dos fornecedores.", "Tell us about the party you have in mind. Amounts are estimates; real prices come from the vendors.")}</p>
          {usage.limit !== null && (
            <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
              {limitReached
                ? t(`Você usou as ${usage.limit} mensagens com a assistente.`, `You have used all ${usage.limit} messages with the assistant.`)
                : t(
                    `Você tem ${usage.remaining} de ${usage.limit} ${usage.limit === 1 ? "mensagem" : "mensagens"} com a assistente. Conte tudo o que puder de uma vez.`,
                    `You have ${usage.remaining} of ${usage.limit} ${usage.limit === 1 ? "message" : "messages"} with the assistant. Share as much as you can at once.`,
                  )}
            </p>
          )}
          {engineNotice && <p className="mt-2 inline-block rounded-lg bg-maracuja-soft px-3 py-1 text-xs font-medium text-[#6b4800]">{engineNotice}</p>}
        </div>

        <div className="flex-1 space-y-5" aria-live="polite">
          {messages.length === 0 && !sending && (
            <div className="rounded-2xl bg-surface p-6">
              <p className="font-display text-xl font-bold">{t("Oi! Vamos organizar sua festa?", "Hi! Shall we plan your party?")}</p>
              <p className="mt-1 text-ink-soft">{t("Na mesma mensagem, diga o tipo de festa, o bairro, quantas pessoas, a data e quanto quer gastar. Quanto mais completo, melhor o planejamento.", "In a single message, tell me the type of party, the neighborhood, how many guests, the date and how much you want to spend. The more complete, the better the plan.")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(lang === "en"
                  ? ["Kids' birthday party for 50 people in Barra, up to R$ 6,000", "Wedding for 120 guests in Niterói", "Company get-together for 40 people in Centro"]
                  : ["Aniversário infantil para 50 pessoas na Barra, até R$ 6 mil", "Casamento para 120 convidados em Niterói", "Confraternização da empresa para 40 pessoas no Centro"]
                ).map((ex) => (
                  <button key={ex} disabled={limitReached} onClick={() => send(ex)} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm hover:border-ink">{ex}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">{m.content}</p>
              </div>
            ) : (
              <div key={m.id} className="space-y-4">
                <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface px-4 py-3 whitespace-pre-line">{m.content.replace(/\*\*/g, "")}</div>
                {m.ui?.plan && (
                  <div className="lg:hidden">
                    <PlanView t={t} lang={lang} plan={{ ...m.ui.plan, items: m.ui.plan.lines.map((l) => ({ ...l, id: l.slug })) }} />
                  </div>
                )}
                {m.ui?.recommendations?.map((rec) => (
                  <div key={rec.categorySlug}>
                    <h3 className="mb-2 flex items-center gap-2 text-lg font-bold">
                      {categoryName({ slug: rec.categorySlug, name: rec.categoryName }, lang)}
                      {budgetFor(rec.categorySlug) != null && <span className="text-sm font-medium text-ink-soft">· {t("verba sugerida", "suggested budget")} {formatBRL(budgetFor(rec.categorySlug))}</span>}
                    </h3>
                    {rec.providers.length === 0 ? (
                      <Alert tone="warn">
                        {t("Nenhum fornecedor cadastrado atende esta categoria com os filtros do seu evento", "No registered vendor in this category matches your event's filters")}
                        {rec.excluded.unavailable + rec.excluded.outOfArea + rec.excluded.capacity > 0 &&
                          ` (${[rec.excluded.outOfArea && `${rec.excluded.outOfArea} ${t("fora da área", "outside the area")}`, rec.excluded.unavailable && `${rec.excluded.unavailable} ${t("indisponíveis na data", "unavailable on the date")}`, rec.excluded.capacity && `${rec.excluded.capacity} ${t("sem capacidade", "without capacity")}`].filter(Boolean).join(", ")})`}
                        . {t("Busque em bairros vizinhos no catálogo ou ajuste a data.", "Search nearby neighborhoods in the catalog or adjust the date.")}
                      </Alert>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {rec.providers.map((p) => {
                          const on = selected.has(p.id);
                          return (
                            <ProviderCard
                              key={p.id}
                              p={p}
                              compact
                              action={
                                <Button variant={on ? "success" : "outline"} size="sm" className="w-full" aria-pressed={on} onClick={() => toggle(p, rec.categorySlug, categoryName({ slug: rec.categorySlug, name: rec.categoryName }, lang))}>
                                  {on ? <><Check className="size-4" /> {t("Selecionado", "Selected")}</> : <><Plus className="size-4" /> {t("Solicitar orçamento", "Request a quote")}</>}
                                </Button>
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ),
          )}
          {sending &&
            (liveText ? (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface px-4 py-3 whitespace-pre-line">{liveText.replace(/\*\*/g, "")}</div>
            ) : (
              <div className="inline-flex items-center gap-3 rounded-2xl bg-surface px-4 py-3" role="status">
                <span className="inline-flex gap-1" aria-hidden>
                  <span className="typing-dot size-2 rounded-full bg-ink" />
                  <span className="typing-dot size-2 rounded-full bg-ink" />
                  <span className="typing-dot size-2 rounded-full bg-ink" />
                </span>
                <span className="text-sm text-ink-soft">{statusText(status, t)}</span>
              </div>
            ))}
          {error && <Alert tone="error">{error}</Alert>}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-0 mt-6 bg-white pb-4 pt-2">
          {selected.size > 0 && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white">
              <span className="text-sm"><strong>{selected.size}</strong> {selected.size === 1 ? t("fornecedor selecionado", "vendor selected") : t("fornecedores selecionados", "vendors selected")}</span>
              <Button size="sm" onClick={() => setDialog(true)}>{t("Pedir orçamentos", "Request quotes")}</Button>
            </div>
          )}
          {limitReached ? (
            <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
              <p className="font-semibold">{t("Suas mensagens com a assistente acabaram.", "You have no messages left with the assistant.")}</p>
              <p className="mt-1 text-ink-soft">
                {plan
                  ? t("Seu planejamento está salvo. Selecione os fornecedores acima e peça orçamentos, ou procure outras opções no catálogo.", "Your plan is saved. Select vendors above and request quotes, or look for more options in the catalog.")
                  : t("Você ainda pode procurar fornecedores no catálogo e pedir orçamentos diretamente.", "You can still browse vendors in the catalog and request quotes directly.")}
              </p>
              <LinkButton href="/fornecedores" size="sm" variant="dark" className="mt-3">{t("Ver catálogo de fornecedores", "Browse vendor catalog")}</LinkButton>
            </div>
          ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 focus-within:border-ink"
          >
            <label htmlFor="chat-input" className="sr-only">{t("Sua mensagem", "Your message")}</label>
            <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={messages.length ? t("Ex.: tire a fotografia, aumente o orçamento para R$ 10 mil…", "E.g. remove photography, raise the budget to R$ 10,000…") : t("Descreva sua festa…", "Describe your party…")}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 focus:outline-none"
            />
            <Button type="submit" disabled={sending || !input.trim()} aria-label={t("Enviar mensagem", "Send message")} className="size-11 !px-0">
              <Send className="size-4" />
            </Button>
          </form>
          )}
        </div>
      </section>

      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] space-y-4 overflow-y-auto pb-4 pr-1">
          <EventSummary event={event} />
          {plan ? <PlanView t={t} lang={lang} plan={plan} /> : <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-soft">{t("O planejamento aparece aqui assim que eu tiver o tipo de festa, o bairro e o número de convidados.", "The plan shows up here as soon as I know the type of party, the neighborhood and the number of guests.")}</p>}
        </div>
      </aside>

      {dialog && eventId && (
        <QuoteDialog
          eventId={eventId}
          conversationId={conversationId}
          selected={[...selected.values()]}
          loggedIn={Boolean(user)}
          isConsumer={!user || user.role === "CONSUMER"}
          onClose={() => setDialog(false)}
          onRemove={(id) => setSelected((prev) => { const n = new Map(prev); n.delete(id); return n; })}
          onDone={() => setSelected(new Map())}
        />
      )}
    </div>
  );
}

function EventSummary({ event }: { event: EventSnap | null }) {
  const { lang, t } = useLang();
  if (!event) return null;
  const rows = [
    { I: CalendarDays, label: t("Data", "Date"), value: event.data ? formatDate(event.data, lang) : event.data_flexivel ? t("Flexível", "Flexible") : null },
    { I: MapPin, label: t("Local", "Location"), value: event.local_reconhecido ? event.local : null },
    { I: Users, label: t("Convidados", "Guests"), value: event.convidados ? `${event.convidados} ${t("pessoas", "people")}` : null },
    { I: Wallet, label: t("Orçamento", "Budget"), value: event.orcamento_total_reais != null ? formatBRL(event.orcamento_total_reais * 100) : null },
  ];
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="text-sm text-ink-soft">{t("Seu evento", "Your event")}</p>
      <p className="font-display text-xl font-bold">{event.tipo !== "OUTRO" ? eventTypeLabel(event.tipo, lang) : t("Ainda sem tipo definido", "Type not defined yet")}</p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(({ I, label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <I className="size-4 text-ink-soft" aria-hidden />
            <dt className="sr-only">{label}</dt>
            <dd className={value ? "" : "text-ink-soft"}>{value ?? `${label}: ${t("a informar", "not provided")}`}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type PlanLike = {
  version: number;
  summary: string;
  savingsTips: string[];
  warnings: string[];
  items: { id: string; slug: string; name: string; icon: string; priority: string; estMin: number; estMax: number; allocated: number; rationale: string | null }[];
};

export function PlanView({ plan, t, lang }: { plan: PlanLike; t: T; lang: "pt" | "en" }) {
  const groups = ["ESSENTIAL", "RECOMMENDED", "OPTIONAL"] as const;
  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-xl font-bold">{t("Planejamento", "Plan")}</p>
        <span className="text-xs text-ink-soft">{t("versão", "version")} {plan.version}</span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{plan.summary}</p>
      {plan.warnings.map((w) => (
        <p key={w} className="mt-3 flex gap-2 rounded-xl bg-maracuja-soft p-3 text-sm text-[#6b4800]"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{w}</p>
      ))}
      {groups.map((g) => {
        const items = plan.items.filter((i) => i.priority === g);
        if (!items.length) return null;
        return (
          <div key={g} className="mt-4">
            <p className="text-sm font-bold">{priorityLabel(g, lang)}</p>
            <ul className="mt-1.5 divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-start gap-3 py-2">
                  <CategoryIcon name={i.icon} className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{categoryName({ slug: i.slug, name: i.name }, lang)}</p>
                    <p className="text-xs text-ink-soft">{t("estimativa", "estimate")} {formatBRL(i.estMin)} – {formatBRL(i.estMax)}</p>
                  </div>
                  <span className="text-sm font-semibold" title={t("Verba sugerida", "Suggested budget")}>{formatBRL(i.allocated)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {plan.savingsTips.length > 0 && (
        <div className="mt-4 rounded-xl bg-folha-soft p-3 text-sm text-folha">
          <p className="flex items-center gap-1.5 font-bold"><PiggyBank className="size-4" aria-hidden /> {t("Para economizar", "Ways to save")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{plan.savingsTips.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">{t("Estimativas de referência, não são orçamentos de fornecedores.", "Reference estimates, not vendor quotes.")}</p>
    </div>
  );
}

function QuoteDialog({
  eventId, conversationId, selected, loggedIn, isConsumer, onClose, onRemove, onDone,
}: {
  eventId: string; conversationId: string | null; selected: Selected[]; loggedIn: boolean; isConsumer: boolean;
  onClose: () => void; onRemove: (id: string) => void; onDone: () => void;
}) {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string; needsLogin?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const { t } = useLang();
  const next = `/planejar${conversationId ? `?c=${conversationId}` : ""}`;

  useEffect(() => {
    if (loggedIn) eventBriefAction(eventId).then((t) => setDescription((d) => d || t));
  }, [eventId, loggedIn]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="qd-title">
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="qd-title" className="text-2xl font-bold">{t("Pedir orçamentos", "Request quotes")}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface" aria-label={t("Fechar", "Close")}><X className="size-5" /></button>
        </div>
        {!loggedIn ? (
          <div className="mt-4 space-y-4">
            <p className="text-ink-soft">{t("Para enviar as solicitações, entre ou crie sua conta. Seu planejamento e a seleção continuam salvos nesta conversa.", "To send the requests, sign in or create an account. Your plan and selection stay saved in this conversation.")}</p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href={`/cadastrar?next=${encodeURIComponent(next)}`}>{t("Criar conta", "Create account")}</LinkButton>
              <LinkButton href={`/entrar?next=${encodeURIComponent(next)}`} variant="outline">{t("Já tenho conta", "I already have an account")}</LinkButton>
            </div>
          </div>
        ) : !isConsumer ? (
          <Alert tone="warn">{t("Você está com uma conta de fornecedor ou administrador. Use uma conta de cliente para pedir orçamentos.", "You are signed in with a vendor or admin account. Use a customer account to request quotes.")}</Alert>
        ) : result?.ok ? (
          <div className="mt-4 space-y-4">
            <Alert tone="success">{result.msg}</Alert>
            <p className="text-sm text-ink-soft">{t("Isto é uma solicitação de orçamento — ainda não há reserva nem contratação. Você será avisada quando os fornecedores responderem.", "This is a quote request — there is no reservation or booking yet. You will be notified when vendors reply.")}</p>
            <LinkButton href="/painel">{t("Acompanhar no meu painel", "Track it in my dashboard")}</LinkButton>
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await requestQuotesAction({
                  eventId,
                  description,
                  items: selected.map((s) => ({ providerId: s.provider.id, categorySlug: s.categorySlug, budget: s.budget })),
                });
                if (r.ok) {
                  setResult({
                    ok: true,
                    msg: t(
                      `${r.created} ${r.created === 1 ? "solicitação enviada" : "solicitações enviadas"}${r.skipped ? ` (${r.skipped} já existia${r.skipped > 1 ? "m" : ""})` : ""}.`,
                      `${r.created} ${r.created === 1 ? "request sent" : "requests sent"}${r.skipped ? ` (${r.skipped} already existed)` : ""}.`,
                    ),
                  });
                  onDone();
                } else setResult({ ok: false, msg: r.error, needsLogin: r.needsLogin });
              });
            }}
          >
            <ul className="divide-y divide-line rounded-xl border border-line">
              {selected.map((s) => (
                <li key={s.provider.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <div className="flex-1">
                    <p className="font-semibold">{s.provider.tradeName}</p>
                    <p className="text-xs text-ink-soft">{s.categoryName}{s.budget != null && ` · ${t("verba informada", "stated budget")}: ${formatBRL(s.budget)}`}</p>
                  </div>
                  <button type="button" onClick={() => onRemove(s.provider.id)} className="text-xs font-semibold text-ink-soft hover:text-pitanga" aria-label={`${t("Remover", "Remove")} ${s.provider.tradeName}`}>{t("Remover", "Remove")}</button>
                </li>
              ))}
            </ul>
            <div>
              <label htmlFor="qd-desc" className="text-sm font-semibold">{t("O que você precisa", "What you need")}</label>
              <Textarea id="qd-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1.5" />
              <p className="mt-1 text-xs text-ink-soft">{t("Os fornecedores selecionados recebem estes dados do evento e seu nome. Seu telefone não é exibido.", "The selected vendors receive these event details and your name. Your phone number is not shown.")}</p>
            </div>
            {result && !result.ok && <Alert tone="error">{result.msg}</Alert>}
            <Button type="submit" disabled={pending || selected.length === 0} className="w-full">
              {pending ? t("Enviando…", "Sending…") : t(`Enviar ${selected.length} ${selected.length === 1 ? "solicitação" : "solicitações"}`, `Send ${selected.length} ${selected.length === 1 ? "request" : "requests"}`)}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

const STATUS_TEXT: Record<string, [string, string]> = {
  reading: ["Lendo seu pedido…", "Reading your request…"],
  "tool:atualizar_evento": ["Anotando os detalhes da festa…", "Noting the party details…"],
  "tool:montar_planejamento": ["Montando o planejamento e buscando fornecedores…", "Building the plan and finding vendors…"],
  "tool:buscar_fornecedores": ["Buscando fornecedores na sua região…", "Looking for vendors in your area…"],
  "tool:verificar_disponibilidade": ["Conferindo as agendas…", "Checking calendars…"],
  writing: ["Escrevendo a resposta…", "Writing the reply…"],
};
function statusText(code: string | null, t: T) {
  const pair = code ? STATUS_TEXT[code] : null;
  return pair ? t(pair[0], pair[1]) : t("Pensando…", "Thinking…");
}
