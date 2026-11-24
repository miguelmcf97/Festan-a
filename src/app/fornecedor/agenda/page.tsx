import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Flash } from "@/components/status";
import { Button, EmptyState, Field, Input, LinkButton, Panel } from "@/components/ui";
import { eventTypeLabel, formatDate, quoteStatusLabel } from "@/lib/format";
import { LOCALE } from "@/lib/i18n";
import { requireUser } from "@/server/auth";
import { getT } from "@/server/i18n";
import { addDays, monthBounds, providerAgenda, summarize, todayRio, type AgendaDay, type DayState } from "@/server/services/agenda";
import { myProvider } from "@/server/services/providers";
import { blockRangeAction, toggleDateAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Agenda", "Calendar") };
}

const CELL: Record<DayState, string> = {
  CLOSED: "bg-folha text-white",
  RESERVED: "bg-maracuja-soft text-[#6b4800] ring-1 ring-inset ring-maracuja",
  BLOCKED: "bg-ink/80 text-white",
  REQUESTED: "bg-white text-ink ring-1 ring-inset ring-pitanga/50 hover:ring-pitanga",
  AVAILABLE: "bg-white text-ink ring-1 ring-inset ring-line hover:ring-ink",
  PAST: "bg-surface text-ink-soft/60",
};

export default async function ProviderAgenda({ searchParams }: { searchParams: Promise<{ mes?: string; ok?: string; erro?: string }> }) {
  const user = await requireUser(["PROVIDER"], "/fornecedor/agenda");
  const prov = await myProvider(user.id);
  const { lang, t } = await getT();
  if (!prov)
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <EmptyState title={t("Você ainda não cadastrou sua empresa", "You have not registered your business yet")} body={t("Complete o cadastro para usar a agenda.", "Complete your sign-up to use the calendar.")} action={<LinkButton href="/seja-fornecedor">{t("Cadastrar empresa", "Register business")}</LinkButton>} />
      </div>
    );

  const sp = await searchParams;
  const today = todayRio();
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : today.slice(0, 7);
  const { first, last } = monthBounds(month);
  const [days, next30] = await Promise.all([providerAgenda(prov.id, first, last), providerAgenda(prov.id, today, addDays(today, 29))]);
  const sum = summarize(days.filter((d) => d.date >= today));
  const sum30 = summarize(next30);
  const prevMonth = monthBounds(addDays(first, -1).slice(0, 7)).first.slice(0, 7);
  const nextMonth = addDays(last, 1).slice(0, 7);
  const monthLabel = new Date(`${first}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { month: "long", year: "numeric", timeZone: "UTC" });
  const lead = new Date(`${first}T12:00:00Z`).getUTCDay(); // semana começa no domingo
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 10, 1 + i, 12)).toLocaleDateString(LOCALE[lang], { weekday: "short", timeZone: "UTC" }));
  const back = `/fornecedor/agenda?mes=${month}`;

  const STATE_LABEL: Record<DayState, string> = {
    CLOSED: t("Fechada", "Booked"),
    RESERVED: t("Reserva", "Reserved"),
    BLOCKED: t("Bloqueada", "Blocked"),
    REQUESTED: t("Pedido", "Request"),
    AVAILABLE: t("Livre", "Open"),
    PAST: "",
  };
  const detail = days.filter((d) => d.state !== "AVAILABLE" && d.state !== "PAST");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <Link href="/fornecedor" className="text-sm font-semibold text-ink-soft hover:text-ink">← {t("Painel", "Dashboard")}</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t("Agenda", "Calendar")}</h1>
          <p className="mt-1.5 max-w-2xl text-ink-soft">
            {t(
              "Veja num só lugar as datas livres, bloqueadas e fechadas. Toque num dia livre para bloquear; toque num dia bloqueado para liberar. A IA só recomenda você em datas livres.",
              "See open, blocked and booked dates in one place. Tap an open day to block it; tap a blocked day to free it. The AI only recommends you on open dates.",
            )}
          </p>
        </div>
      </div>

      <div className="mt-5"><Flash ok={sp.ok} erro={sp.erro} /></div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: sum30.available, label: t("datas livres nos próximos 30 dias", "open dates in the next 30 days"), cls: "" },
          { n: sum30.closed, label: t("datas fechadas (contratação confirmada)", "booked dates (confirmed)"), cls: "text-folha" },
          { n: sum30.reserved + sum30.requested, label: t("datas com reserva ou pedido em aberto", "dates with a reservation or open request"), cls: "text-[#8a5a00]" },
          { n: sum30.blocked, label: t("datas bloqueadas por você", "dates you blocked"), cls: "text-ink-soft" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-surface p-4">
            <p className={clsx("font-display text-3xl font-bold", k.cls)}>{k.n}</p>
            <p className="text-sm text-ink-soft">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <Link href={`/fornecedor/agenda?mes=${prevMonth}`} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label={t("Mês anterior", "Previous month")}><ChevronLeft className="size-5" /></Link>
            <h2 className="text-xl font-bold first-letter:uppercase">{monthLabel}</h2>
            <Link href={`/fornecedor/agenda?mes=${nextMonth}`} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label={t("Próximo mês", "Next month")}><ChevronRight className="size-5" /></Link>
          </div>
          {month !== today.slice(0, 7) && (
            <p className="mt-1 text-center"><Link href="/fornecedor/agenda" className="text-sm font-semibold text-pitanga hover:underline">{t("Voltar para o mês atual", "Back to this month")}</Link></p>
          )}

          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-ink-soft" aria-hidden>
            {weekdays.map((w) => <span key={w} className="first-letter:uppercase">{w.replace(".", "")}</span>)}
          </div>
          <ol className="mt-1.5 grid grid-cols-7 gap-1.5" aria-label={t("Dias do mês", "Days of the month")}>
            {Array.from({ length: lead }, (_, i) => <li key={`pad-${i}`} aria-hidden />)}
            {days.map((d) => (
              <li key={d.date}>
                <DayCell d={d} label={STATE_LABEL[d.state]} back={back} lang={lang} t={t} />
              </li>
            ))}
          </ol>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-soft" aria-label={t("Legenda", "Legend")}>
            {(["AVAILABLE", "REQUESTED", "RESERVED", "CLOSED", "BLOCKED"] as DayState[]).map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5"><span className={clsx("inline-block size-3.5 rounded", CELL[s])} aria-hidden />{STATE_LABEL[s]}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">
            {t(
              "Fechada = contratação confirmada. Reserva = cliente aceitou sua proposta e falta você confirmar. Pedido = solicitação de orçamento em aberto para a data.",
              "Booked = confirmed booking. Reserved = the customer accepted your proposal and you still need to confirm. Request = open quote request for the date.",
            )}
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-bold">{t("Neste mês (a partir de hoje)", "This month (from today)")}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-ink-soft">{t("Livres", "Open")}</dt><dd className="text-xl font-bold">{sum.available}</dd></div>
              <div><dt className="text-ink-soft">{t("Fechadas", "Booked")}</dt><dd className="text-xl font-bold text-folha">{sum.closed}</dd></div>
              <div><dt className="text-ink-soft">{t("Reservas", "Reserved")}</dt><dd className="text-xl font-bold">{sum.reserved}</dd></div>
              <div><dt className="text-ink-soft">{t("Bloqueadas", "Blocked")}</dt><dd className="text-xl font-bold">{sum.blocked}</dd></div>
            </dl>
          </Panel>

          <Panel>
            <h2 className="text-lg font-bold">{t("Bloquear um período", "Block a period")}</h2>
            <p className="text-sm text-ink-soft">{t("Férias, outro evento, manutenção… Até 92 dias de uma vez.", "Holidays, another event, maintenance… Up to 92 days at once.")}</p>
            <form action={blockRangeAction} className="mt-3 space-y-3">
              <input type="hidden" name="back" value={back} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={t("De", "From")} htmlFor="bf"><Input id="bf" name="from" type="date" min={today} required /></Field>
                <Field label={t("Até", "To")} htmlFor="bt"><Input id="bt" name="to" type="date" min={today} required /></Field>
              </div>
              <Field label={t("Observação (só você vê)", "Note (only you see it)")} htmlFor="bn"><Input id="bn" name="note" maxLength={120} /></Field>
              <Button size="sm" variant="dark" className="w-full">{t("Bloquear período", "Block period")}</Button>
            </form>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6">
        <h2 className="text-lg font-bold">{t("Datas com movimento neste mês", "Dates with activity this month")}</h2>
        {detail.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t("Nenhuma data fechada, reservada, bloqueada ou com pedido neste mês.", "No booked, reserved, blocked or requested dates this month.")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {detail.map((d) => (
              <li key={d.date} className="flex flex-wrap items-start gap-3 py-3 text-sm">
                <span className={clsx("mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", CELL[d.state])}>{STATE_LABEL[d.state]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatDate(d.date, lang)}</p>
                  {d.state === "BLOCKED" && <p className="text-ink-soft">{d.note || t("Bloqueada por você", "Blocked by you")}</p>}
                  {d.items.map((i) => (
                    <p key={i.quoteId}>
                      <Link href={`/fornecedor/oportunidades/${i.quoteId}`} className="hover:underline">
                        {eventTypeLabel(i.eventType, lang)}
                        {i.guests ? ` · ${i.guests} ${t("convidados", "guests")}` : ""}
                        {i.consumer ? ` · ${i.consumer}` : ""}
                      </Link>{" "}
                      <span className="text-ink-soft">— {quoteStatusLabel(i.status, lang)}</span>
                    </p>
                  ))}
                </div>
                {d.state === "BLOCKED" && d.date >= today && (
                  <form action={toggleDateAction}>
                    <input type="hidden" name="date" value={d.date} />
                    <input type="hidden" name="back" value={back} />
                    <Button size="sm" variant="ghost">{t("Liberar", "Free up")}</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function DayCell({ d, label, back, lang, t }: { d: AgendaDay; label: string; back: string; lang: "pt" | "en"; t: (pt: string, en: string) => string }) {
  const dayNum = Number(d.date.slice(8));
  const full = formatDate(d.date, lang);
  const base = "flex h-16 w-full flex-col items-start justify-between rounded-xl p-1.5 text-left sm:h-20 sm:p-2";
  const inner = (
    <>
      <span className="text-sm font-bold">{dayNum}</span>
      {label && (
        <span className="w-full truncate text-[10px] font-semibold sm:text-xs">
          {d.state === "REQUESTED" && d.items.length > 1 ? `${d.items.length} ${t("pedidos", "requests")}` : label}
        </span>
      )}
    </>
  );
  if (d.state === "PAST") return <div className={clsx(base, CELL.PAST)} aria-label={full}>{inner}</div>;
  if (d.state === "CLOSED" || d.state === "RESERVED") {
    const q = d.items.find((i) => (d.state === "CLOSED" ? ["BOOKED", "COMPLETED"] : ["PROPOSAL_ACCEPTED"]).includes(i.status)) ?? d.items[0];
    return q ? (
      <Link href={`/fornecedor/oportunidades/${q.quoteId}`} className={clsx(base, CELL[d.state])} aria-label={`${full}: ${label}`}>{inner}</Link>
    ) : (
      <div className={clsx(base, CELL[d.state])} aria-label={`${full}: ${label}`}>{inner}</div>
    );
  }
  // Livre, com pedido ou bloqueada: um toque alterna o bloqueio
  const action = d.state === "BLOCKED" ? t("Liberar", "Free up") : t("Bloquear", "Block");
  return (
    <form action={toggleDateAction} className="h-full">
      <input type="hidden" name="date" value={d.date} />
      <input type="hidden" name="back" value={back} />
      <button className={clsx(base, CELL[d.state], "cursor-pointer transition-shadow")} aria-label={`${action} ${full}${d.state !== "AVAILABLE" ? ` (${label})` : ""}`} title={`${action} ${full}`}>
        {inner}
      </button>
    </form>
  );
}
