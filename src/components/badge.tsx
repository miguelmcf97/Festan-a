import clsx from "clsx";
import type { ReactNode } from "react";

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "green" | "yellow" | "red" | "ink"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-surface text-ink-soft",
    green: "bg-folha-soft text-folha",
    yellow: "bg-maracuja-soft text-[#7a5300]",
    red: "bg-pitanga-soft text-pitanga-dark",
    ink: "bg-ink text-white",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

