import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { getActiveCategories } from "./catalog-cache";
import { formatBRL } from "@/lib/format";
import { categoryName, makeT, type Lang } from "@/lib/i18n";
import { categories, eventPlans, planItems } from "../db/schema";

export type Priority = "ESSENTIAL" | "RECOMMENDED" | "OPTIONAL";
export type EventTypeKey =
  | "ANIVERSARIO"
  | "ANIVERSARIO_INFANTIL"
  | "QUINZE_ANOS"
  | "CASAMENTO"
  | "CHA_DE_BEBE"
  | "CHA_REVELACAO"
  | "FORMATURA"
  | "CORPORATIVO"
  | "FAMILIAR"
  | "TEMATICA"
  | "OUTRO";

/** Pacotes de serviços sugeridos por tipo de evento (ponto de partida; a IA ajusta). */
export const DEFAULT_PACKAGES: Record<EventTypeKey, { slug: string; priority: Priority }[]> = {
  ANIVERSARIO_INFANTIL: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "doces-e-bolos", priority: "ESSENTIAL" },
    { slug: "decoracao", priority: "ESSENTIAL" },
    { slug: "brinquedos-inflaveis", priority: "RECOMMENDED" },
    { slug: "recreacao", priority: "RECOMMENDED" },
    { slug: "fotografia", priority: "RECOMMENDED" },
    { slug: "personagens", priority: "OPTIONAL" },
    { slug: "pipoca-e-algodao-doce", priority: "OPTIONAL" },
  ],
  QUINZE_ANOS: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "decoracao", priority: "ESSENTIAL" },
    { slug: "dj", priority: "ESSENTIAL" },
    { slug: "doces-e-bolos", priority: "ESSENTIAL" },
    { slug: "fotografia", priority: "RECOMMENDED" },
    { slug: "iluminacao", priority: "RECOMMENDED" },
    { slug: "filmagem", priority: "OPTIONAL" },
    { slug: "cerimonial", priority: "OPTIONAL" },
  ],
  CASAMENTO: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "decoracao", priority: "ESSENTIAL" },
    { slug: "fotografia", priority: "ESSENTIAL" },
    { slug: "cerimonial", priority: "RECOMMENDED" },
    { slug: "dj", priority: "RECOMMENDED" },
    { slug: "doces-e-bolos", priority: "RECOMMENDED" },
    { slug: "filmagem", priority: "OPTIONAL" },
    { slug: "musica-ao-vivo", priority: "OPTIONAL" },
  ],
  CHA_DE_BEBE: [
    { slug: "decoracao", priority: "ESSENTIAL" },
    { slug: "doces-e-bolos", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "RECOMMENDED" },
    { slug: "fotografia", priority: "RECOMMENDED" },
    { slug: "espaco-de-festas", priority: "OPTIONAL" },
  ],
  CHA_REVELACAO: [
    { slug: "decoracao", priority: "ESSENTIAL" },
    { slug: "doces-e-bolos", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "RECOMMENDED" },
    { slug: "fotografia", priority: "RECOMMENDED" },
    { slug: "espaco-de-festas", priority: "OPTIONAL" },
  ],
  FORMATURA: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "dj", priority: "ESSENTIAL" },
    { slug: "iluminacao", priority: "RECOMMENDED" },
    { slug: "fotografia", priority: "RECOMMENDED" },
    { slug: "filmagem", priority: "OPTIONAL" },
  ],
  CORPORATIVO: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "sonorizacao", priority: "RECOMMENDED" },
    { slug: "fotografia", priority: "RECOMMENDED" },
    { slug: "dj", priority: "OPTIONAL" },
  ],
  ANIVERSARIO: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "doces-e-bolos", priority: "RECOMMENDED" },
    { slug: "decoracao", priority: "RECOMMENDED" },
    { slug: "dj", priority: "OPTIONAL" },
    { slug: "fotografia", priority: "OPTIONAL" },
  ],
  FAMILIAR: [
    { slug: "churrasco", priority: "ESSENTIAL" },
    { slug: "mesas-e-cadeiras", priority: "RECOMMENDED" },
    { slug: "doces-e-bolos", priority: "RECOMMENDED" },
    { slug: "sitios-e-chacaras", priority: "OPTIONAL" },
  ],
  TEMATICA: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "decoracao", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "dj", priority: "RECOMMENDED" },
    { slug: "fotografia", priority: "OPTIONAL" },
  ],
  OUTRO: [
    { slug: "espaco-de-festas", priority: "ESSENTIAL" },
    { slug: "buffet", priority: "ESSENTIAL" },
    { slug: "decoracao", priority: "RECOMMENDED" },
  ],
};

const PRIORITY_WEIGHT: Record<Priority, number> = { ESSENTIAL: 1, RECOMMENDED: 0.85, OPTIONAL: 0.7 };
const PRIORITY_ORDER: Record<Priority, number> = { ESSENTIAL: 0, RECOMMENDED: 1, OPTIONAL: 2 };

export type PlanInputItem = { slug: string; priority: Priority; rationale?: string | null };
export type PlanLine = {
  categoryId: string;
  slug: string;
  name: string;
  icon: string;
  priority: Priority;
  estMin: number;
  estMax: number;
  allocated: number;
  rationale: string | null;
  included: boolean;
};
export type ComputedPlan = {
  lines: PlanLine[];
  totalEstMin: number;
  totalEstMax: number;
  budget: number | null;
  reserve: number; // reserva para imprevistos
  summary: string;
  savingsTips: string[];
  warnings: string[];
};

/**
 * Calcula estimativas e distribuição de orçamento de forma DETERMINÍSTICA a partir dos
 * parâmetros de categoria (editáveis no admin). A IA escolhe serviços e prioridades; os números
 * vêm daqui — assim nunca são "inventados" pelo modelo e são sempre rotulados como estimativa.
 */
export async function computePlan(input: {
  items: PlanInputItem[];
  guests: number | null;
  budget: number | null; // centavos
  eventTypeLabel: string;
  lang?: Lang;
}): Promise<ComputedPlan> {
  const t = makeT(input.lang ?? "pt");
  const fmt = (c: number) => formatBRL(c);
  const slugs = [...new Set(input.items.map((i) => i.slug))];
  // catálogo em cache (evita uma ida ao banco por planejamento)
  const cats = slugs.length ? (await getActiveCategories()).filter((c) => slugs.includes(c.slug)) : [];
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const guests = Math.max(input.guests ?? 50, 1);

  const lines: PlanLine[] = [];
  for (const item of input.items) {
    const c = bySlug.get(item.slug);
    if (!c || lines.some((l) => l.slug === c.slug)) continue;
    let estMin = 0,
      estMax = 0;
    if (c.estPerGuestMin != null && c.estPerGuestMax != null) {
      estMin += c.estPerGuestMin * guests;
      estMax += c.estPerGuestMax * guests;
    }
    if (c.estFixedMin != null && c.estFixedMax != null) {
      estMin += c.estFixedMin;
      estMax += c.estFixedMax;
    }
    if (estMax === 0) {
      estMin = 50_000;
      estMax = 200_000;
    }
    lines.push({
      categoryId: c.id,
      slug: c.slug,
      name: categoryName(c, input.lang ?? "pt"),
      icon: c.icon,
      priority: item.priority,
      estMin: roundTo(estMin, 5000),
      estMax: roundTo(estMax, 5000),
      allocated: 0,
      rationale: item.rationale ?? null,
      included: true,
    });
  }
  lines.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const totalEstMin = lines.reduce((s, l) => s + l.estMin, 0);
  const totalEstMax = lines.reduce((s, l) => s + l.estMax, 0);
  const warnings: string[] = [];
  const savingsTips: string[] = [];
  const budget = input.budget;
  let reserve = 0;

  if (budget && lines.length) {
    reserve = roundTo(budget * 0.08, 5000); // 8% de reserva para imprevistos
    const distributable = budget - reserve;
    const mids = lines.map((l) => ((l.estMin + l.estMax) / 2) * PRIORITY_WEIGHT[l.priority]);
    const sumMid = mids.reduce((s, x) => s + x, 0);
    lines.forEach((l, i) => (l.allocated = roundTo((distributable * mids[i]) / sumMid, 5000)));

    const essentialsMin = lines.filter((l) => l.priority === "ESSENTIAL").reduce((s, l) => s + l.estMin, 0);
    if (essentialsMin > budget) {
      warnings.push(
        t(
          "O orçamento está abaixo do mínimo estimado só para os itens essenciais. Vale rever o número de convidados, o formato (ex.: coquetel em vez de jantar) ou o local.",
          "The budget is below the minimum estimate for the essential items alone. Consider fewer guests, a different format (e.g. cocktail instead of dinner) or another venue.",
        ),
      );
    } else if (totalEstMin > budget) {
      warnings.push(t("Com todos os itens, a estimativa mínima passa do orçamento. Priorize os essenciais e trate os opcionais como extras.", "With every item included, the minimum estimate exceeds the budget. Prioritize the essentials and treat the optional items as extras."));
    }
    for (const l of lines) if (l.allocated < l.estMin * 0.85) l.rationale = appendNote(l.rationale, t("verba sugerida abaixo da faixa estimada", "suggested budget below the estimated range"));
  } else if (!budget) {
    lines.forEach((l) => (l.allocated = Math.round((l.estMin + l.estMax) / 2)));
  }

  const has = (s: string) => lines.some((l) => l.slug === s);
  if (has("buffet") && guests >= 60) savingsTips.push(t("Buffet costuma ser o maior custo: coquetel volante ou almoço tendem a sair mais barato que jantar completo.", "Catering is usually the biggest cost: a standing cocktail or lunch tends to be cheaper than a full dinner."));
  if (has("espaco-de-festas")) savingsTips.push(t("Datas de domingo a quinta e meses de baixa temporada costumam ter preços melhores nos espaços.", "Venues are usually cheaper from Sunday to Thursday and in the low season."));
  if (has("decoracao")) savingsTips.push(t("Decoração no formato pegue-e-monte reduz custo quando a festa é menor.", "Pick-up-and-assemble decoration kits cut costs for smaller parties."));
  if (has("fotografia") && has("filmagem")) savingsTips.push(t("Contratar foto e vídeo com o mesmo fornecedor costuma gerar desconto de pacote.", "Booking photo and video with the same vendor usually earns a package discount."));
  savingsTips.push(t("Peça orçamento a 2 ou 3 fornecedores por categoria e compare o que está incluso, não só o preço.", "Ask 2 or 3 vendors per category for a quote and compare what is included, not just the price."));

  const summary = budget
    ? t(
        `${input.eventTypeLabel} para ${guests} pessoas com orçamento de ${fmt(budget)}. Estimativa para os ${lines.length} serviços: ${fmt(totalEstMin)} a ${fmt(totalEstMax)}, com reserva de ${fmt(reserve)} para imprevistos.`,
        `${input.eventTypeLabel} for ${guests} people with a ${fmt(budget)} budget. Estimate for the ${lines.length} services: ${fmt(totalEstMin)} to ${fmt(totalEstMax)}, with ${fmt(reserve)} set aside for contingencies.`,
      )
    : t(
        `${input.eventTypeLabel} para ${guests} pessoas. Estimativa para os ${lines.length} serviços: ${fmt(totalEstMin)} a ${fmt(totalEstMax)}. Informe um orçamento para eu distribuir a verba.`,
        `${input.eventTypeLabel} for ${guests} people. Estimate for the ${lines.length} services: ${fmt(totalEstMin)} to ${fmt(totalEstMax)}. Share a budget and I will split it across the services.`,
      );

  return { lines, totalEstMin, totalEstMax, budget, reserve, summary, savingsTips: savingsTips.slice(0, 4), warnings };
}

export async function savePlan(eventId: string, plan: ComputedPlan, source: "AI" | "USER", promptVersion?: string) {
  const last = await db.query.eventPlans.findFirst({ where: eq(eventPlans.eventId, eventId), orderBy: desc(eventPlans.version) });
  const version = (last?.version ?? 0) + 1;
  const [saved] = await db
    .insert(eventPlans)
    .values({ eventId, version, source, summary: plan.summary, savingsTips: plan.savingsTips, warnings: plan.warnings, promptVersion })
    .returning();
  if (plan.lines.length)
    await db.insert(planItems).values(
      plan.lines.map((l, i) => ({
        planId: saved.id,
        categoryId: l.categoryId,
        priority: l.priority,
        estMin: l.estMin,
        estMax: l.estMax,
        allocated: l.allocated,
        rationale: l.rationale,
        included: l.included,
        sortOrder: i,
      })),
    );
  return { ...saved, version };
}

export async function latestPlan(eventId: string) {
  return db.query.eventPlans.findFirst({
    where: eq(eventPlans.eventId, eventId),
    orderBy: desc(eventPlans.version),
    with: { items: { with: { category: true }, orderBy: (i, { asc }) => [asc(i.sortOrder)] } },
  });
}

function roundTo(v: number, step: number) {
  return Math.max(step, Math.round(v / step) * step);
}
function appendNote(a: string | null, b: string) {
  return a ? `${a} (${b})` : b.charAt(0).toUpperCase() + b.slice(1);
}
