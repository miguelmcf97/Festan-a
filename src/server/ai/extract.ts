/**
 * Extração determinística de dados do evento a partir de texto livre em português.
 * Usada pelo modo demonstração (sem LLM) e como apoio para resolver localização.
 */
import type { EventTypeKey } from "../services/planning";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export type Extracted = {
  type?: EventTypeKey;
  guests?: number;
  budgetCents?: number;
  date?: string; // YYYY-MM-DD
  locationHint?: string;
  hasVenue?: boolean;
  serviceKeywords: string[]; // slugs de categoria mencionados
  removeKeywords: string[]; // slugs que o cliente quer retirar
};

const TYPE_PATTERNS: [RegExp, EventTypeKey][] = [
  [/\b15 anos\b|\bdebutante|\bquinze anos/, "QUINZE_ANOS"],
  [/casamento|\bcasar\b|bodas|noivos?/, "CASAMENTO"],
  [/cha de bebe|cha de fralda/, "CHA_DE_BEBE"],
  [/cha revela/, "CHA_REVELACAO"],
  [/formatura/, "FORMATURA"],
  [/confraterniza|corporativ|empresa|fim de ano da equipe/, "CORPORATIVO"],
  [/(aniversario|festa|niver).{0,40}(infantil|crianca|filh|\d{1,2} anos?\b(?!.{0,10}(pessoas|convidados)))|infantil/, "ANIVERSARIO_INFANTIL"],
  [/tematic/, "TEMATICA"],
  [/familia|almoco de domingo|reuniao familiar/, "FAMILIAR"],
  [/aniversario|niver/, "ANIVERSARIO"],
];

export const SERVICE_KEYWORDS: Record<string, string[]> = {
  "espaco-de-festas": ["espaco", "salao", "casa de festa", "casa de evento", "local"],
  "sitios-e-chacaras": ["sitio", "chacara"],
  "mesas-e-cadeiras": ["mesas", "cadeiras"],
  "tendas-e-estruturas": ["tenda", "estrutura"],
  buffet: ["buffet", "comida", "jantar", "salgado", "coquetel"],
  churrasco: ["churrasco", "churrasqueiro"],
  "food-trucks": ["food truck", "foodtruck"],
  "doces-e-bolos": ["bolo", "doce", "docinho", "confeitaria"],
  "cascata-de-chocolate": ["cascata", "fondue"],
  "pipoca-e-algodao-doce": ["pipoca", "algodao doce", "carrinho"],
  "brinquedos-inflaveis": ["inflave", "pula-pula", "pula pula", "brinquedo"],
  personagens: ["personagem", "personagens"],
  recreacao: ["recreacao", "recreador", "monitor"],
  "musica-ao-vivo": ["musica ao vivo", "banda", "cantor", "voz e violao"],
  dj: ["dj", "musica", "som de festa"],
  fotografia: ["foto", "fotografo", "fotografia"],
  filmagem: ["filmagem", "video", "filmar"],
  decoracao: ["decoracao", "decorar", "baloes", "painel"],
  cerimonial: ["cerimonial", "cerimonialista", "assessoria"],
  iluminacao: ["iluminacao", "luzes"],
  sonorizacao: ["sonorizacao", "microfone", "caixa de som"],
};

export function extractEventInfo(text: string, today = new Date()): Extracted {
  const t = norm(text);
  const out: Extracted = { serviceKeywords: [], removeKeywords: [] };

  for (const [re, type] of TYPE_PATTERNS) if (re.test(t)) { out.type = type; break; }

  const g = t.match(/(\d{1,4})\s*(pessoas|convidados|pax|criancas e adultos|adultos|criancas)/);
  if (g) out.guests = Number(g[1]);

  const b =
    t.match(/(?:orcamento|tenho|ate|budget|verba|gastar)[^\d]{0,25}r?\$?\s*([\d.,]+)\s*(mil|k)?/) ??
    t.match(/r\$\s*([\d.,]+)\s*(mil|k)?/);
  if (b) {
    let n = Number(b[1].replace(/\.(?=\d{3})/g, "").replace(",", "."));
    if (b[2]) n *= 1000;
    if (n >= 100) out.budgetCents = Math.round(n * 100);
  }

  out.date = parseDate(t, today) ?? undefined;

  const loc = t.match(/\b(?:no|na|em|bairro)\s+([a-z][a-z\s]{2,30}?)(?=[,.;!?]|\s+(?:com|para|pra|no dia|dia|em|e quero|quero|orcamento|$))/);
  if (loc && !/^(local|espaco|salao|casa)\b/.test(loc[1].trim())) out.locationHint = loc[1].trim();

  if (/(nao tenho|sem|ainda nao (tenho|defini|escolhi))\s+(o\s+|um\s+)?(local|espaco|salao)|preciso de (um )?(local|espaco|salao)/.test(t)) out.hasVenue = false;
  else if (/(ja tenho|tenho)\s+(o\s+|um\s+)?(local|espaco|salao)|na minha casa|em casa|no condominio|salao do predio/.test(t)) out.hasVenue = true;

  for (const [slug, kws] of Object.entries(SERVICE_KEYWORDS)) {
    for (const kw of kws) {
      const neg = new RegExp(`(sem|tirar|retir\\w*|remov\\w*|nao (quero|preciso)( de)?)\\s+(o |a |os |as )?${kw}`);
      if (neg.test(t)) { out.removeKeywords.push(slug); break; }
      if (t.includes(kw)) { out.serviceKeywords.push(slug); break; }
    }
  }
  // "musica" genérica não deve duplicar com música ao vivo
  if (out.serviceKeywords.includes("musica-ao-vivo")) out.serviceKeywords = out.serviceKeywords.filter((s) => s !== "dj" || /\bdj\b/.test(t));
  return out;
}

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

export function parseDate(t: string, today: Date): string | null {
  const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const nextYearIfPast = (m: number, d: number, y?: number) => {
    if (y) return y < 100 ? 2000 + y : y;
    const candidate = new Date(today.getFullYear(), m - 1, d);
    return candidate < today ? today.getFullYear() + 1 : today.getFullYear();
  };
  const num = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (num) {
    const d = +num[1], m = +num[2];
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return iso(nextYearIfPast(m, d, num[3] ? +num[3] : undefined), m, d);
  }
  const ext = t.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/);
  if (ext) {
    const d = +ext[1], m = MONTHS[ext[2]];
    return iso(nextYearIfPast(m, d, ext[3] ? +ext[3] : undefined), m, d);
  }
  return null;
}

/** Cidades grandes demais para usar o município inteiro como referência de distância. */
const NEEDS_NEIGHBORHOOD = new Set(["rio de janeiro"]);

/**
 * Resolve um nome de bairro/município para um Location cadastrado (match aproximado).
 * precision = "city" quando só o município foi reconhecido.
 */
export function matchLocation<T extends { id: string; name: string; city: string }>(
  hint: string,
  all: T[],
): { loc: T; precision: "neighborhood" | "city"; needsNeighborhood: boolean } | null {
  const h = norm(hint).replace(/^(o|a|os|as)\s+/, "").trim();
  if (!h || h.length < 3) return null;
  const isCityName = all.some((l) => norm(l.city) === h);
  if (!isCityName) {
    const exact = all.find((l) => norm(l.name) === h && norm(l.name) !== "centro");
    if (exact) return { loc: exact, precision: "neighborhood", needsNeighborhood: false };
    const contains = all.find((l) => norm(l.name) !== "centro" && (h.includes(norm(l.name)) || norm(l.name).includes(h)));
    if (contains) return { loc: contains, precision: "neighborhood", needsNeighborhood: false };
  }
  const cityMatches = all.filter((l) => norm(l.city) === h || h.includes(norm(l.city)));
  const loc = cityMatches.find((l) => norm(l.name) === "centro") ?? cityMatches[0];
  if (!loc) return null;
  return { loc, precision: "city", needsNeighborhood: NEEDS_NEIGHBORHOOD.has(norm(loc.city)) };
}
