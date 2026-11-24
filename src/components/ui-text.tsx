"use client";
import { BadgeCheck, Star } from "lucide-react";
import { Badge } from "./badge";
import { useLang } from "./i18n-client";

export function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useLang();
  return verified ? (
    <Badge tone="green"><BadgeCheck className="size-3.5" /> {t("Verificado", "Verified")}</Badge>
  ) : (
    <Badge>{t("Não verificado", "Not verified")}</Badge>
  );
}

export function DemoBadge() {
  const { t } = useLang();
  return <Badge tone="yellow" className="whitespace-nowrap">{t("Demonstração", "Demo")}</Badge>;
}

export function Stars({ value, count }: { value: number | null; count: number }) {
  const { lang, t } = useLang();
  if (value == null || count === 0) return <span className="text-sm text-ink-soft">{t("Sem avaliações ainda", "No reviews yet")}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-4 fill-maracuja text-maracuja" aria-hidden />
      <strong>{lang === "en" ? value.toFixed(1) : value.toFixed(1).replace(".", ",")}</strong>
      <span className="text-ink-soft">({count} {lang === "en" ? (count === 1 ? "review" : "reviews") : count === 1 ? "avaliação" : "avaliações"})</span>
    </span>
  );
}
