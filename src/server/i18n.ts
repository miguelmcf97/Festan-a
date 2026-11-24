import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, parseLang, type Lang, type T } from "@/lib/i18n";

/** Idioma escolhido pela pessoa (cookie pf_lang). Padrão: português. */
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getT(): Promise<{ lang: Lang; t: T }> {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
