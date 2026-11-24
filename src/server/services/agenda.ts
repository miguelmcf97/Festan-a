import "server-only";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import { availability, events, quoteRequests } from "../db/schema";

/** Situação de um dia na agenda do fornecedor, da mais forte para a mais fraca. */
export type DayState = "CLOSED" | "RESERVED" | "BLOCKED" | "REQUESTED" | "AVAILABLE" | "PAST";

export type AgendaDay = {
  date: string; // YYYY-MM-DD
  state: DayState;
  note: string | null; // observação do bloqueio
  items: { quoteId: string; status: string; eventType: string; guests: number | null; consumer: string }[];
};

const OPEN = ["NEW", "IN_REVIEW", "AWAITING_INFO", "QUOTED"] as const;

/** Data de hoje no fuso do Rio (as festas acontecem lá). */
export function todayRio(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthBounds(month: string): { first: string; last: string } {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

/** Monta a agenda entre duas datas: bloqueios, contratações confirmadas, reservas e pedidos em aberto. */
export async function providerAgenda(providerId: string, from: string, to: string): Promise<AgendaDay[]> {
  const [avail, quotes] = await Promise.all([
    db.query.availability.findMany({
      where: and(eq(availability.providerId, providerId), gte(availability.date, from), lte(availability.date, to)),
    }),
    db
      .select({
        id: quoteRequests.id,
        status: quoteRequests.status,
        date: events.date,
        type: events.type,
        guests: events.guests,
        consumerId: quoteRequests.consumerId,
      })
      .from(quoteRequests)
      .innerJoin(events, eq(events.id, quoteRequests.eventId))
      .where(
        and(
          eq(quoteRequests.providerId, providerId),
          gte(events.date, from),
          lte(events.date, to),
          inArray(quoteRequests.status, [...OPEN, "PROPOSAL_ACCEPTED", "BOOKED", "COMPLETED"]),
        ),
      ),
  ]);
  const consumerIds = [...new Set(quotes.map((q) => q.consumerId))];
  const consumers = consumerIds.length
    ? await db.query.users.findMany({ where: (u, { inArray: inA }) => inA(u.id, consumerIds), columns: { id: true, name: true } })
    : [];
  const firstName = new Map(consumers.map((c) => [c.id, c.name.split(" ")[0]]));
  const availBy = new Map(avail.map((a) => [a.date, a]));
  const today = todayRio();

  const days: AgendaDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const a = availBy.get(d);
    const qs = quotes.filter((q) => q.date === d);
    const items = qs.map((q) => ({ quoteId: q.id, status: q.status, eventType: q.type, guests: q.guests, consumer: firstName.get(q.consumerId) ?? "" }));
    let state: DayState;
    if (a?.status === "BOOKED" || qs.some((q) => q.status === "BOOKED" || q.status === "COMPLETED")) state = "CLOSED";
    else if (qs.some((q) => q.status === "PROPOSAL_ACCEPTED")) state = "RESERVED";
    else if (a?.status === "BLOCKED") state = "BLOCKED";
    else if (d < today) state = "PAST";
    else if (qs.length) state = "REQUESTED";
    else state = "AVAILABLE";
    days.push({ date: d, state, note: a?.note ?? null, items });
  }
  return days;
}

export function summarize(days: AgendaDay[]) {
  const count = (s: DayState) => days.filter((d) => d.state === s).length;
  return {
    closed: count("CLOSED"),
    reserved: count("RESERVED"),
    blocked: count("BLOCKED"),
    requested: count("REQUESTED"),
    available: count("AVAILABLE"),
  };
}
