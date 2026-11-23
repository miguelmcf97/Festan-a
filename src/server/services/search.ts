import "server-only";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { haversineKm } from "@/lib/geo";
import { db } from "../db";
import { getActiveCategories, getActiveLocations } from "./catalog-cache";
import {
  availability,
  categories,
  locations,
  providerCategories,
  providers,
} from "../db/schema";

export type SearchParams = {
  categorySlugs?: string[];
  locationId?: string | null;
  date?: string | null; // YYYY-MM-DD
  guests?: number | null;
  budgetMax?: number | null; // centavos, para a categoria
  query?: string | null;
  verifiedOnly?: boolean;
  limit?: number;
};

export type ProviderCard = {
  id: string;
  slug: string;
  tradeName: string;
  shortPitch: string | null;
  description: string;
  coverTone: string;
  categories: { slug: string; name: string; icon: string }[];
  location: { name: string; city: string };
  distanceKm: number | null;
  serviceRadiusKm: number;
  priceMin: number | null;
  priceMax: number | null;
  priceNote: string | null;
  minGuests: number | null;
  maxGuests: number | null;
  avgRating: number | null;
  reviewCount: number;
  responseRate: number | null;
  verified: boolean;
  isDemo: boolean;
  availableOnDate: boolean | null; // null = data não informada
  reasons: string[]; // por que combina (mostrado ao cliente)
  warnings: string[]; // pontos de atenção
  score: number;
};

export type SearchResult = {
  providers: ProviderCard[];
  excluded: { unavailable: number; outOfArea: number; capacity: number };
  totalCandidates: number;
};

/**
 * Busca fornecedores REAIS cadastrados e aprovados. É a única fonte que a IA pode usar
 * para recomendar — nada aqui é inventado.
 */
export async function searchProviders(p: SearchParams): Promise<SearchResult> {
  const limit = Math.min(p.limit ?? 12, 50);

  let categoryIds: string[] | null = null;
  if (p.categorySlugs?.length) {
    const cats = await getActiveCategories();
    const wanted = new Set(cats.filter((c) => p.categorySlugs!.includes(c.slug)).map((c) => c.id));
    // inclui subcategorias
    for (const c of cats) if (c.parentId && wanted.has(c.parentId)) wanted.add(c.id);
    categoryIds = [...wanted];
    if (categoryIds.length === 0) return { providers: [], excluded: { unavailable: 0, outOfArea: 0, capacity: 0 }, totalCandidates: 0 };
  }

  const conditions = [eq(providers.status, "APPROVED")];
  if (p.verifiedOnly) conditions.push(eq(providers.verification, "VERIFIED"));
  if (categoryIds) {
    conditions.push(
      inArray(
        providers.id,
        db.select({ id: providerCategories.providerId }).from(providerCategories).where(inArray(providerCategories.categoryId, categoryIds)),
      ),
    );
  }
  if (p.query?.trim()) {
    const q = `%${p.query.trim().slice(0, 60)}%`;
    conditions.push(or(ilike(providers.tradeName, q), ilike(providers.description, q))!);
  }

  const rows = await db.query.providers.findMany({
    where: and(...conditions),
    with: {
      location: true,
      categories: { with: { category: true } },
      serviceAreas: true,
    },
    limit: 500,
  });

  const target = p.locationId ? ((await getActiveLocations()).find((l) => l.id === p.locationId) ?? null) : null;

  let blocked = new Set<string>();
  if (p.date && rows.length) {
    const b = await db
      .select({ providerId: availability.providerId })
      .from(availability)
      .where(and(eq(availability.date, p.date), inArray(availability.providerId, rows.map((r) => r.id))));
    blocked = new Set(b.map((x) => x.providerId));
  }

  const excluded = { unavailable: 0, outOfArea: 0, capacity: 0 };
  const cards: ProviderCard[] = [];

  for (const r of rows) {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let distanceKm: number | null = null;

    if (target) {
      distanceKm = Math.round(haversineKm(target, r.location) * 10) / 10;
      const coversArea = r.serviceAreas.some((a) => a.locationId === target.id) || r.locationId === target.id;
      if (!coversArea && distanceKm > r.serviceRadiusKm) {
        excluded.outOfArea++;
        continue;
      }
      reasons.push(coversArea ? `Atende ${target.name}` : `A ${distanceKm.toLocaleString("pt-BR")} km, dentro do raio de atendimento`);
    }

    if (p.date) {
      if (blocked.has(r.id)) {
        excluded.unavailable++;
        continue;
      }
      reasons.push("Data sem bloqueio na agenda informada pelo fornecedor");
    }

    if (p.guests) {
      if (r.maxGuests != null && r.maxGuests < p.guests) {
        excluded.capacity++;
        continue;
      }
      if (r.minGuests != null && r.minGuests > p.guests) warnings.push(`Atende a partir de ${r.minGuests} convidados`);
      else if (r.maxGuests != null) reasons.push(`Capacidade para até ${r.maxGuests} convidados`);
    }

    let priceFit = 0.5;
    if (p.budgetMax != null && r.priceMin != null) {
      if (r.priceMin <= p.budgetMax) {
        priceFit = 1;
        reasons.push("Faixa de preço informada compatível com a verba sugerida");
      } else if (r.priceMin <= p.budgetMax * 1.2) {
        priceFit = 0.4;
        warnings.push("Preço inicial um pouco acima da verba sugerida");
      } else {
        priceFit = 0;
        warnings.push("Preço inicial acima da verba sugerida para esta categoria");
      }
    } else if (p.budgetMax != null) {
      warnings.push("Fornecedor não informou faixa de preço — peça orçamento");
    }

    if (r.verification === "VERIFIED") reasons.push("Fornecedor verificado pela Planfest");
    if (r.reviewCount > 0 && r.avgRating != null) reasons.push(`Nota ${r.avgRating.toFixed(1)} em ${r.reviewCount} avaliação(ões) de contratações`);

    // Pontuação: nota com suavização bayesiana, proximidade, verificação, resposta, preço
    const prior = 4.2, weight = 3;
    const bayes = r.avgRating != null ? (r.avgRating * r.reviewCount + prior * weight) / (r.reviewCount + weight) : prior - 0.3;
    const ratingScore = (bayes / 5) * 35;
    const distScore = distanceKm == null ? 10 : Math.max(0, 20 * (1 - distanceKm / Math.max(r.serviceRadiusKm, 1)));
    const verifiedScore = r.verification === "VERIFIED" ? 15 : 0;
    const respScore = (r.responseRate ?? 0.6) * 15;
    const priceScore = priceFit * 15;
    const score = Math.round((ratingScore + distScore + verifiedScore + respScore + priceScore) * 10) / 10;

    cards.push({
      id: r.id,
      slug: r.slug,
      tradeName: r.tradeName,
      shortPitch: r.shortPitch,
      description: r.description,
      coverTone: r.coverTone,
      categories: r.categories.map((c) => ({ slug: c.category.slug, name: c.category.name, icon: c.category.icon })),
      location: { name: r.location.name, city: r.location.city },
      distanceKm,
      serviceRadiusKm: r.serviceRadiusKm,
      priceMin: r.priceMin,
      priceMax: r.priceMax,
      priceNote: r.priceNote,
      minGuests: r.minGuests,
      maxGuests: r.maxGuests,
      avgRating: r.avgRating,
      reviewCount: r.reviewCount,
      responseRate: r.responseRate,
      verified: r.verification === "VERIFIED",
      isDemo: r.isDemo,
      availableOnDate: p.date ? true : null,
      reasons,
      warnings,
      score,
    });
  }

  cards.sort((a, b) => b.score - a.score);
  return { providers: cards.slice(0, limit), excluded, totalCandidates: rows.length };
}

export async function listActiveCategories() {
  return getActiveCategories();
}

export async function listLocations() {
  return getActiveLocations();
}

export async function providerCountByCategory() {
  const rows = await db
    .select({ categoryId: providerCategories.categoryId, n: sql<number>`count(*)::int` })
    .from(providerCategories)
    .innerJoin(providers, eq(providers.id, providerCategories.providerId))
    .where(eq(providers.status, "APPROVED"))
    .groupBy(providerCategories.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.n]));
}

