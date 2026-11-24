"use client";
import { bookingStatusLabel, quoteStatusLabel } from "@/lib/format";
import { useLang } from "./i18n-client";
import { msg } from "@/lib/messages-en";
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
  const { lang } = useLang();
  return <Badge tone={QUOTE_TONE[status] ?? "neutral"}>{quoteStatusLabel(status, lang)}</Badge>;
}

export function BookingStatus({ status }: { status: string }) {
  const { lang } = useLang();
  const tone = status === "CONFIRMED" || status === "COMPLETED" ? "green" : status === "CANCELLED" ? "red" : "yellow";
  return <Badge tone={tone}>{bookingStatusLabel(status, lang)}</Badge>;
}

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  const { lang } = useLang();
  if (!ok && !erro) return null;
  return (
    <div role={erro ? "alert" : "status"} className={`mb-5 rounded-xl px-4 py-3 text-sm ${erro ? "bg-pitanga-soft text-pitanga-dark" : "bg-folha-soft text-folha"}`}>
      {msg(erro ?? ok, lang)}
    </div>
  );
}
