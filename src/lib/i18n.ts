// Idiomas da interface. Português é o padrão; o inglês cobre a interface e as respostas da IA.
// Dados digitados por pessoas (descrições de fornecedores, mensagens, nomes de bairros) não são traduzidos.

export type Lang = "pt" | "en";
export const LANGS: Lang[] = ["pt", "en"];
export const LANG_COOKIE = "pf_lang";

export function parseLang(v: string | null | undefined): Lang {
  return v === "en" ? "en" : "pt";
}

/** t("Texto em português", "English text") — escolhe pelo idioma atual. */
export type T = (pt: string, en: string) => string;
export function makeT(lang: Lang): T {
  return lang === "en" ? (_pt, en) => en : (pt) => pt;
}

export const LOCALE: Record<Lang, string> = { pt: "pt-BR", en: "en-US" };

// Nomes das categorias em inglês (as categorias ficam no banco em português).
export const CATEGORY_EN: Record<string, string> = {
  "espaco-de-festas": "Party venues",
  "sitios-e-chacaras": "Country houses and farms",
  "mesas-e-cadeiras": "Table and chair rental",
  "tendas-e-estruturas": "Tents and structures",
  buffet: "Buffet",
  churrasco: "Barbecue",
  "food-trucks": "Food trucks and carts",
  "doces-e-bolos": "Sweets and cakes",
  "cascata-de-chocolate": "Chocolate fountains",
  "pipoca-e-algodao-doce": "Popcorn and cotton candy",
  "brinquedos-inflaveis": "Bouncy castles",
  personagens: "Costumed characters",
  recreacao: "Kids' entertainment",
  "musica-ao-vivo": "Live music",
  dj: "DJs",
  fotografia: "Photography",
  filmagem: "Videography",
  decoracao: "Decoration",
  cerimonial: "Event planning and coordination",
  iluminacao: "Lighting",
  sonorizacao: "Sound system",
};

export const GROUP_EN: Record<string, string> = {
  "Espaços e infraestrutura": "Venues and infrastructure",
  Alimentação: "Food",
  Entretenimento: "Entertainment",
  "Serviços especializados": "Specialized services",
};

export function categoryName(c: { slug: string; name: string } | null | undefined, lang: Lang): string {
  if (!c) return "";
  return lang === "en" ? (CATEGORY_EN[c.slug] ?? c.name) : c.name;
}

export function groupName(g: string, lang: Lang): string {
  return lang === "en" ? (GROUP_EN[g] ?? g) : g;
}
