/**
 * MÁQUINA DE ESTADOS — Solicitação de orçamento (quote_requests.status).
 * Fonte da verdade das transições permitidas. Ver docs/REGRAS_DE_NEGOCIO.md §3.
 * Módulo puro (sem banco) para ser testável.
 */
export type QuoteStatus =
  | "NEW" | "IN_REVIEW" | "AWAITING_INFO" | "QUOTED" | "PROPOSAL_ACCEPTED" | "BOOKED" | "COMPLETED" | "CANCELLED" | "DECLINED";

export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  NEW: ["IN_REVIEW", "AWAITING_INFO", "QUOTED", "DECLINED", "CANCELLED"],
  IN_REVIEW: ["AWAITING_INFO", "QUOTED", "DECLINED", "CANCELLED"],
  AWAITING_INFO: ["IN_REVIEW", "QUOTED", "DECLINED", "CANCELLED"],
  QUOTED: ["QUOTED", "PROPOSAL_ACCEPTED", "AWAITING_INFO", "DECLINED", "CANCELLED"],
  PROPOSAL_ACCEPTED: ["BOOKED", "CANCELLED"],
  BOOKED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  DECLINED: [],
};

export class BusinessRuleError extends Error {}

export function assertTransition(from: QuoteStatus, to: QuoteStatus) {
  if (!QUOTE_TRANSITIONS[from].includes(to)) throw new BusinessRuleError(`Transição não permitida: ${from} → ${to}`);
}
