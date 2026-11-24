"use client";
import { createContext, useContext, useMemo } from "react";
import { makeT, type Lang, type T } from "@/lib/i18n";

const LangContext = createContext<Lang>("pt");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): { lang: Lang; t: T } {
  const lang = useContext(LangContext);
  return useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
}
