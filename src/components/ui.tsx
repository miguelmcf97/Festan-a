import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  Armchair, Beef, Building2, Cake, Camera, Candy, Castle, ClipboardCheck, Disc3, Drama, Flower2,
  Lamp, MicVocal, PartyPopper, Popcorn, Sparkles, Speaker, Tent, Trees, Truck, Utensils, Video,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  "building-2": Building2, trees: Trees, armchair: Armchair, tent: Tent, utensils: Utensils, beef: Beef, truck: Truck,
  cake: Cake, candy: Candy, popcorn: Popcorn, castle: Castle, drama: Drama, "party-popper": PartyPopper,
  "mic-vocal": MicVocal, "disc-3": Disc3, camera: Camera, video: Video, "flower-2": Flower2,
  "clipboard-check": ClipboardCheck, lamp: Lamp, speaker: Speaker, sparkles: Sparkles,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Sparkles;
  return <I className={className} aria-hidden />;
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
const buttonVariants = {
  primary: "bg-pitanga text-white hover:bg-pitanga-dark",
  dark: "bg-ink text-white hover:bg-ink-soft",
  outline: "border border-line bg-white text-ink hover:border-ink",
  ghost: "text-ink hover:bg-surface",
  success: "bg-folha text-white hover:opacity-90",
};
const buttonSizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[0.95rem]", lg: "h-13 px-7 text-base" };
type BtnProps = { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes };

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & BtnProps) {
  return <button className={clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}
export function LinkButton({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & BtnProps) {
  return <Link className={clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

export { Badge } from "./badge";
export { VerifiedBadge, DemoBadge, Stars } from "./ui-text";

const TONES: Record<string, string> = {
  violet: "#6d4bd1", emerald: "#0f8a68", amber: "#d98a00", teal: "#0f7f86", sky: "#1f86c9", rose: "#d6455d",
  pink: "#d24a8f", fuchsia: "#a63fb5", orange: "#e0661b", lime: "#5f8f12", red: "#c93a2c", yellow: "#d9a400",
  green: "#2f8a3a", purple: "#7b44b8", indigo: "#4650c4", cyan: "#13849c", slate: "#4b5875", blue: "#2c66d1", stone: "#7a6a58",
};

/** Capa ilustrada enquanto o fornecedor não envia fotos reais. Não simula fotografia. */
export function ProviderCover({ tone, icon, className, label }: { tone: string; icon: string; className?: string; label?: string }) {
  const color = TONES[tone] ?? TONES.violet;
  return (
    <div className={clsx("relative overflow-hidden", className)} style={{ background: color }} role="img" aria-label={label ?? "Capa ilustrativa"}>
      <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
        <defs>
          <pattern id={`dots-${tone}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill="#fff" />
            <rect x="13" y="12" width="5" height="2.5" rx="1" fill="#fff" transform="rotate(35 15 13)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${tone})`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-white/95 shadow-sm">
          <CategoryIcon name={icon} className="size-8" />
        </span>
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs font-medium text-pitanga-dark">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.95rem] placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";
export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={clsx(inputCls, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={clsx(inputCls, "min-h-24", props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={clsx(inputCls, "pr-8", props.className)} />;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("rounded-2xl border border-line bg-white p-5", className)}>{children}</section>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-ink-soft">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const t = {
    info: "bg-surface text-ink",
    error: "bg-pitanga-soft text-pitanga-dark",
    success: "bg-folha-soft text-folha",
    warn: "bg-maracuja-soft text-[#6b4800]",
  }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={clsx("rounded-xl px-4 py-3 text-sm", t)}>{children}</div>;
}
