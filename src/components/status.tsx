import { BOOKING_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/format";
import { Badge } from "./ui";

const QUOTE_TONE: Record<string, "neutral" | "green" | "yellow" | "red" | "ink"> = {
  NEW: "ink",
  IN_REVIEW: "neutral",
  AWAITING_INFO: "yellow",
  QUOTED: "yellow",
  PROPOSAL_ACCEPTED: "yellow",
  BOOKED: "green",
  COMPLETED: "green",
  CANCELLED: "red",
  DECLINED: "red",
};

export function QuoteStatus({ status }: { status: string }) {
  return <Badge tone={QUOTE_TONE[status] ?? "neutral"}>{QUOTE_STATUS_LABEL[status] ?? status}</Badge>;
}

export function BookingStatus({ status }: { status: string }) {
  const tone = status === "CONFIRMED" || status === "COMPLETED" ? "green" : status === "CANCELLED" ? "red" : "yellow";
  return <Badge tone={tone}>{BOOKING_STATUS_LABEL[status] ?? status}</Badge>;
}

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (!ok && !erro) return null;
  return (
    <div role={erro ? "alert" : "status"} className={`mb-5 rounded-xl px-4 py-3 text-sm ${erro ? "bg-pitanga-soft text-pitanga-dark" : "bg-folha-soft text-folha"}`}>
      {erro ?? ok}
    </div>
  );
}
