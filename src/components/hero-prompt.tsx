"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { useLang } from "./i18n-client";

const EXAMPLES = {
  pt: [
    "Aniversário infantil para 80 pessoas em Jacarepaguá, com R$ 8 mil, brinquedos e churrasco",
    "Festa de 15 anos para 100 pessoas em Niterói, orçamento de R$ 12 mil",
    "Chá revelação para 30 pessoas em casa, na Tijuca",
  ],
  en: [
    "Kids' birthday party for 80 people in Jacarepaguá, R$ 8,000, bouncy castles and barbecue",
    "Sweet fifteen party for 100 people in Niterói, R$ 12,000 budget",
    "Gender reveal party for 30 people at home in Tijuca",
  ],
};

export function HeroPrompt() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  const go = (q: string) => router.push(`/planejar?q=${encodeURIComponent(q.trim())}`);
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) go(text);
        }}
        className="rounded-3xl bg-white p-2 shadow-[0_10px_40px_-12px_rgba(42,24,70,0.45)]"
      >
        <label htmlFor="hero-q" className="sr-only">{t("Descreva sua festa", "Describe your party")}</label>
        <textarea
          id="hero-q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) go(text);
            }
          }}
          rows={3}
          placeholder={t("Ex.: aniversário de 6 anos do meu filho para 80 pessoas, em Campo Grande, dia 14 de março, gastando até R$ 8 mil…", "E.g. my son’s 6th birthday for 80 people in Campo Grande on March 14, spending up to R$ 8,000…")}
          className="w-full resize-none rounded-2xl px-4 pt-3 text-lg text-ink placeholder:text-ink-soft/60 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="hidden text-xs text-ink-soft sm:block">{t("Sem cadastro para começar. Você só cria conta ao pedir orçamentos.", "No sign-up to start. You only create an account to request quotes.")}</p>
          <button className="ml-auto inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:bg-ink-soft" disabled={!text.trim()}>
            {t("Planejar minha festa", "Plan my party")} <Send className="size-4" aria-hidden />
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES[lang].map((ex) => (
          <button key={ex} type="button" onClick={() => go(ex)} className="rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-left text-sm text-white hover:bg-white/20">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
