// Utilidades de formatação (pt-BR). Dinheiro sempre em centavos.

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return brl.format(Math.round(cents / 100));
}

export function formatRange(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${formatBRL(min)} – ${formatBRL(max)}`;
  return `a partir de ${formatBRL(min ?? max)}`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "Data a definir";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
