// Utilidades de formatação. Dinheiro sempre em centavos e sempre em reais (R$), em qualquer idioma.
import { LOCALE, type Lang } from "./i18n";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return brl.format(Math.round(cents / 100));
}

export function formatRange(min?: number | null, max?: number | null, lang: Lang = "pt"): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${formatBRL(min)} – ${formatBRL(max)}`;
  return `${lang === "en" ? "from" : "a partir de"} ${formatBRL(min ?? max)}`;
}

export function formatDate(d: string | Date | null | undefined, lang: Lang = "pt"): string {
  if (!d) return lang === "en" ? "Date to be defined" : "Data a definir";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString(LOCALE[lang], { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function formatShortDate(d: string | Date, lang: Lang = "pt"): string {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString(LOCALE[lang], { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function formatDateTime(d: Date | string, lang: Lang = "pt"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(LOCALE[lang], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function reaisToCents(input: string | number | null | undefined): number | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function maskDocument(doc: string): string {
  const digits = doc.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export const EVENT_TYPE_LABEL: Record<string, string> = {
  ANIVERSARIO: "Aniversário",
  ANIVERSARIO_INFANTIL: "Aniversário infantil",
  QUINZE_ANOS: "Festa de 15 anos",
  CASAMENTO: "Casamento",
  CHA_DE_BEBE: "Chá de bebê",
  CHA_REVELACAO: "Chá revelação",
  FORMATURA: "Formatura",
  CORPORATIVO: "Confraternização / corporativo",
  FAMILIAR: "Evento familiar",
  TEMATICA: "Festa temática",
  OUTRO: "Evento",
};

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  NEW: "Nova solicitação",
  IN_REVIEW: "Em análise",
  AWAITING_INFO: "Aguardando informações",
  QUOTED: "Orçamento enviado",
  PROPOSAL_ACCEPTED: "Proposta aceita",
  BOOKED: "Contratação confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  DECLINED: "Recusada",
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING_CONFIRMATION: "Reserva — aguardando confirmação do fornecedor",
  CONFIRMED: "Contratação confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const PRIORITY_LABEL: Record<string, string> = {
  ESSENTIAL: "Essencial",
  RECOMMENDED: "Recomendado",
  OPTIONAL: "Opcional",
};

// ───── Rótulos em inglês (mesmas chaves) ─────
const EN: Record<string, Record<string, string>> = {
  event: {
    ANIVERSARIO: "Birthday party",
    ANIVERSARIO_INFANTIL: "Kids' birthday party",
    QUINZE_ANOS: "Sweet fifteen party",
    CASAMENTO: "Wedding",
    CHA_DE_BEBE: "Baby shower",
    CHA_REVELACAO: "Gender reveal party",
    FORMATURA: "Graduation party",
    CORPORATIVO: "Corporate event",
    FAMILIAR: "Family gathering",
    TEMATICA: "Themed party",
    OUTRO: "Event",
  },
  quote: {
    NEW: "New request",
    IN_REVIEW: "Under review",
    AWAITING_INFO: "Waiting for information",
    QUOTED: "Quote sent",
    PROPOSAL_ACCEPTED: "Proposal accepted",
    BOOKED: "Booking confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    DECLINED: "Declined",
  },
  booking: {
    PENDING_CONFIRMATION: "Reservation — waiting for the provider to confirm",
    CONFIRMED: "Booking confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  },
  priority: { ESSENTIAL: "Essential", RECOMMENDED: "Recommended", OPTIONAL: "Optional" },
};
const PT: Record<string, Record<string, string>> = {
  event: EVENT_TYPE_LABEL,
  quote: QUOTE_STATUS_LABEL,
  booking: BOOKING_STATUS_LABEL,
  priority: PRIORITY_LABEL,
};

export function eventTypeLabel(k: string | null | undefined, lang: Lang = "pt") {
  return (lang === "en" ? EN : PT).event[k ?? "OUTRO"] ?? k ?? "";
}
export function quoteStatusLabel(k: string, lang: Lang = "pt") {
  return (lang === "en" ? EN : PT).quote[k] ?? k;
}
export function bookingStatusLabel(k: string, lang: Lang = "pt") {
  return (lang === "en" ? EN : PT).booking[k] ?? k;
}
export function priorityLabel(k: string, lang: Lang = "pt") {
  return (lang === "en" ? EN : PT).priority[k] ?? k;
}
export function eventTypeOptions(lang: Lang = "pt") {
  return Object.keys(EVENT_TYPE_LABEL).map((k) => ({ value: k, label: eventTypeLabel(k, lang) }));
}
