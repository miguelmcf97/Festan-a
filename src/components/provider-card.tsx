import Link from "next/link";
import type { ReactNode } from "react";
import { Check, MapPin, TriangleAlert, Users } from "lucide-react";
import { formatRange } from "@/lib/format";
import type { ProviderCard as Card } from "@/server/services/search";
import { DemoBadge, ProviderCover, Stars, VerifiedBadge } from "./ui";

export function ProviderCard({ p, action, compact = false }: { p: Card; action?: ReactNode; compact?: boolean }) {
  const price = formatRange(p.priceMin, p.priceMax);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <Link href={`/fornecedores/${p.slug}`} className="block" tabIndex={-1} aria-hidden>
        <ProviderCover tone={p.coverTone} icon={p.categories[0]?.icon ?? "sparkles"} className={compact ? "h-24" : "h-32"} />
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <VerifiedBadge verified={p.verified} />
          {p.isDemo && <DemoBadge />}
        </div>
        <h3 className="text-lg font-bold leading-tight">
          <Link href={`/fornecedores/${p.slug}`} className="hover:underline">{p.tradeName}</Link>
        </h3>
        {p.shortPitch && !compact && <p className="text-sm text-ink-soft">{p.shortPitch}</p>}
        <p className="text-xs text-ink-soft">{p.categories.map((c) => c.name).join(", ")}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{p.location.name}{p.distanceKm != null && ` · ${p.distanceKm.toLocaleString("pt-BR")} km`}</span>
          {p.maxGuests && <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />até {p.maxGuests}</span>}
        </div>
        <Stars value={p.avgRating} count={p.reviewCount} />
        <p className="text-sm">
          {price ? <><strong>{price}</strong>{p.priceNote && <span className="text-ink-soft"> · {p.priceNote}</span>}</> : <span className="text-ink-soft">Preço sob consulta</span>}
        </p>
        {(p.reasons.length > 0 || p.warnings.length > 0) && (
          <ul className="space-y-1 text-[0.8rem]">
            {p.reasons.slice(0, compact ? 2 : 3).map((r) => (
              <li key={r} className="flex gap-1.5 text-folha"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />{r}</li>
            ))}
            {p.warnings.slice(0, 2).map((w) => (
              <li key={w} className="flex gap-1.5 text-[#8a5a00]"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />{w}</li>
            ))}
          </ul>
        )}
        {action && <div className="mt-auto pt-2">{action}</div>}
      </div>
    </article>
  );
}
