import { setLangAction } from "@/app/lang-actions";
import type { Lang } from "@/lib/i18n";

/** Seletor de idioma (canto superior direito). Funciona sem JavaScript: cada opção é um botão de formulário. */
export function LangSwitch({ lang }: { lang: Lang }) {
  const opts: { v: Lang; short: string; label: string }[] = [
    { v: "pt", short: "PT", label: "Português" },
    { v: "en", short: "EN", label: "English" },
  ];
  return (
    <form action={setLangAction} className="flex items-center rounded-full border border-line p-0.5" aria-label={lang === "en" ? "Site language" : "Idioma do site"}>
      {opts.map((o) => {
        const active = o.v === lang;
        return (
          <button
            key={o.v}
            name="lang"
            value={o.v}
            aria-pressed={active}
            title={o.label}
            aria-label={o.label}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${active ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}
          >
            {o.short}
          </button>
        );
      })}
    </form>
  );
}
