import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { EVENT_TYPE_LABEL, eventTypeLabel } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { db } from "../db";
import { availability, categories, events, locations, providers } from "../db/schema";
import { getActiveCategories, getActiveLocations } from "../services/catalog-cache";
import { computePlan, latestPlan, savePlan, type ComputedPlan, type EventTypeKey } from "../services/planning";
import { searchProviders, type ProviderCard } from "../services/search";
import { matchLocation } from "./extract";
import { PROMPT_VERSION } from "./prompts";

export type ToolContext = { eventId: string; lang?: Lang };

/** O que a interface recebe junto com a resposta da IA. */
export type UiPayload = {
  plan?: ComputedPlan & { version: number };
  recommendations?: { categorySlug: string; categoryName: string; providers: ProviderCard[]; excluded: { unavailable: number; outOfArea: number; capacity: number } }[];
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as [EventTypeKey, ...EventTypeKey[]];

// ───────────────── Definições (formato JSON Schema, independente de fornecedor de LLM) ─────────────────

export const TOOL_DEFS = [
  {
    name: "atualizar_evento",
    description:
      "Registra/atualiza dados do evento informados pela pessoa. Envie apenas os campos que mudaram. Retorna o estado consolidado e os campos que ainda faltam.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: EVENT_TYPES },
        titulo: { type: "string", description: "Título curto, ex.: 'Aniversário de 6 anos do Theo'" },
        data: { type: "string", description: "YYYY-MM-DD. Use apenas se a pessoa informou dia exato." },
        data_flexivel: { type: "boolean" },
        bairro_ou_cidade: { type: "string", description: "Bairro ou município como a pessoa falou" },
        convidados: { type: "integer", minimum: 1, maximum: 5000 },
        orcamento_total_reais: { type: "number", minimum: 0 },
        ja_tem_local: { type: "boolean" },
        preferencias: { type: "object", description: "Estilo, tema, cardápio, restrições, horário etc.", additionalProperties: true },
      },
    },
  },
  {
    name: "montar_planejamento",
    description:
      "Gera (ou refaz) o planejamento. Pode receber em 'evento' os dados novos da festa (mesmos campos de atualizar_evento), aplicados antes do cálculo — use isso para fazer tudo numa chamada só. O sistema calcula estimativas e a distribuição do orçamento e JÁ BUSCA fornecedores reais para as categorias essenciais (até 4). Use os números e fornecedores retornados; nunca invente outros.",
    input_schema: {
      type: "object",
      required: ["itens"],
      properties: {
        evento: { type: "object", description: "Opcional. Mesmos campos de atualizar_evento.", additionalProperties: true },
        itens: {
          type: "array",
          minItems: 1,
          maxItems: 14,
          items: {
            type: "object",
            required: ["categoria_slug", "prioridade"],
            properties: {
              categoria_slug: { type: "string" },
              prioridade: { type: "string", enum: ["ESSENTIAL", "RECOMMENDED", "OPTIONAL"] },
              motivo: { type: "string", description: "Por que este serviço faz sentido para este evento (1 frase)" },
            },
          },
        },
        buscar_fornecedores: { type: "boolean", description: "Padrão true: já traz fornecedores das categorias essenciais." },
      },
    },
  },
  {
    name: "buscar_fornecedores",
    description:
      "Busca fornecedores REAIS cadastrados e aprovados na Planfest para uma categoria, filtrando automaticamente por região, data e convidados do evento. Única fonte permitida para recomendar fornecedores.",
    input_schema: {
      type: "object",
      required: ["categoria_slug"],
      properties: {
        categoria_slug: { type: "string" },
        budget_max_reais: { type: "number", description: "Verba sugerida para a categoria (do planejamento)" },
        termo: { type: "string", description: "Palavra-chave opcional (ex.: 'vegano', 'tema safari')" },
        limite: { type: "integer", minimum: 1, maximum: 6 },
      },
    },
  },
  {
    name: "verificar_disponibilidade",
    description: "Verifica se fornecedores (por slug) têm a data bloqueada na agenda informada por eles. Não garante reserva.",
    input_schema: {
      type: "object",
      required: ["fornecedores_slugs", "data"],
      properties: {
        fornecedores_slugs: { type: "array", items: { type: "string" }, maxItems: 10 },
        data: { type: "string", description: "YYYY-MM-DD" },
      },
    },
  },
] as const;

// ───────────────── Execução ─────────────────

const updateSchema = z.object({
  tipo: z.enum(EVENT_TYPES).optional(),
  titulo: z.string().max(120).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_flexivel: z.boolean().optional(),
  bairro_ou_cidade: z.string().max(80).optional(),
  convidados: z.number().int().min(1).max(5000).optional(),
  orcamento_total_reais: z.number().min(0).max(10_000_000).optional(),
  ja_tem_local: z.boolean().optional(),
  preferencias: z.record(z.string(), z.unknown()).optional(),
});
const planSchema = z.object({
  evento: z.record(z.string(), z.unknown()).optional(),
  buscar_fornecedores: z.boolean().optional(),
  itens: z
    .array(z.object({ categoria_slug: z.string(), prioridade: z.enum(["ESSENTIAL", "RECOMMENDED", "OPTIONAL"]), motivo: z.string().max(300).optional() }))
    .min(1)
    .max(14),
});
const searchSchema = z.object({
  categoria_slug: z.string(),
  budget_max_reais: z.number().min(0).optional(),
  termo: z.string().max(60).optional(),
  limite: z.number().int().min(1).max(6).optional(),
});
const availSchema = z.object({ fornecedores_slugs: z.array(z.string()).max(10), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function eventSnapshot(eventId: string) {
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId), with: { location: true } });
  if (!ev) throw new Error("Evento não encontrado");
  const missing: string[] = [];
  if (ev.type === "OUTRO" && ev.title === "Novo evento") missing.push("tipo de evento");
  if (!ev.locationId) missing.push("bairro ou cidade");
  if (!ev.guests) missing.push("número de convidados");
  if (!ev.budgetTotal) missing.push("orçamento total");
  if (!ev.date && !ev.dateFlexible) missing.push("data");
  return {
    tipo: ev.type,
    tipo_label: EVENT_TYPE_LABEL[ev.type],
    titulo: ev.title,
    data: ev.date,
    data_flexivel: ev.dateFlexible,
    local: ev.location ? `${ev.location.name}, ${ev.location.city}` : ev.locationText,
    local_reconhecido: Boolean(ev.locationId),
    convidados: ev.guests,
    orcamento_total_reais: ev.budgetTotal != null ? ev.budgetTotal / 100 : null,
    ja_tem_local: ev.hasVenue,
    preferencias: ev.preferences,
    faltando: missing,
  };
}

type EventRow = typeof events.$inferSelect;

/** Aplica dados do evento informados pela IA. Retorna aviso sobre a localização, se houver. */
async function applyEventUpdate(eventId: string, input: z.infer<typeof updateSchema>, lang: Lang = "pt"): Promise<string | undefined> {
  const patch: Partial<typeof events.$inferInsert> = {};
  if (input.tipo) patch.type = input.tipo;
  if (input.titulo) patch.title = input.titulo;
  else if (input.tipo) patch.title = eventTypeLabel(input.tipo, lang);
  if (input.data) patch.date = input.data;
  if (input.data_flexivel != null) patch.dateFlexible = input.data_flexivel;
  if (input.convidados) patch.guests = input.convidados;
  if (input.orcamento_total_reais != null) patch.budgetTotal = Math.round(input.orcamento_total_reais * 100);
  if (input.ja_tem_local != null) patch.hasVenue = input.ja_tem_local;
  let locationNote: string | undefined;
  if (input.bairro_ou_cidade) {
    const m = matchLocation(input.bairro_ou_cidade, await getActiveLocations());
    patch.locationText = input.bairro_ou_cidade;
    if (m && !m.needsNeighborhood) patch.locationId = m.loc.id;
    else if (m) locationNote = `Cidade reconhecida (${m.loc.city}), mas é grande demais para calcular distâncias. Pergunte o bairro ou a região (ex.: Barra, Tijuca, Campo Grande).`;
    else locationNote = `"${input.bairro_ou_cidade}" ainda não está na área de cobertura cadastrada (Região Metropolitana do Rio). Pergunte um bairro ou município próximo.`;
  }
  if (input.preferencias) {
    const cur = await db.query.events.findFirst({ where: eq(events.id, eventId), columns: { preferences: true } });
    patch.preferences = { ...(cur?.preferences ?? {}), ...input.preferencias };
  }
  if (Object.keys(patch).length) await db.update(events).set(patch).where(eq(events.id, eventId));
  return locationNote;
}

/** Busca fornecedores reais de uma categoria para o evento e registra os cards na interface. */
async function runSearch(
  ev: EventRow,
  categorySlug: string,
  opts: { budgetMax?: number | null; query?: string | null; limit?: number; lang?: Lang },
  ui: UiPayload,
) {
  const cat = (await getActiveCategories()).find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const res = await searchProviders({
    categorySlugs: [cat.slug],
    locationId: ev.locationId,
    date: ev.date,
    guests: ev.guests,
    budgetMax: opts.budgetMax ?? null,
    query: opts.query,
    limit: opts.limit ?? 4,
    lang: opts.lang,
  });
  ui.recommendations = [
    ...(ui.recommendations ?? []).filter((r) => r.categorySlug !== cat.slug),
    { categorySlug: cat.slug, categoryName: cat.name, providers: res.providers, excluded: res.excluded },
  ];
  return {
    categoria: cat.name,
    categoria_slug: cat.slug,
    encontrados: res.providers.length,
    filtros_aplicados: { regiao: Boolean(ev.locationId), data: ev.date, convidados: ev.guests },
    descartados: { indisponiveis_na_data: res.excluded.unavailable, fora_da_area: res.excluded.outOfArea, capacidade: res.excluded.capacity },
    fornecedores: res.providers.map((p) => ({
      slug: p.slug,
      nome: p.tradeName,
      bairro: p.location.name,
      distancia_km: p.distanceKm,
      faixa_preco_reais: p.priceMin != null ? [p.priceMin / 100, (p.priceMax ?? p.priceMin) / 100] : null,
      nota: p.avgRating,
      avaliacoes: p.reviewCount,
      verificado: p.verified,
      is_demo: p.isDemo,
      motivos: p.reasons,
      atencao: p.warnings,
    })),
  };
}

export async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
  ui: UiPayload,
): Promise<{ result: unknown; isError?: boolean }> {
  try {
    switch (name) {
      case "atualizar_evento": {
        const input = updateSchema.parse(rawInput);
        const aviso = await applyEventUpdate(ctx.eventId, input, ctx.lang);
        return { result: { evento: await eventSnapshot(ctx.eventId), aviso_local: aviso } };
      }

      case "montar_planejamento": {
        const input = planSchema.parse(rawInput);
        const aviso = input.evento ? await applyEventUpdate(ctx.eventId, updateSchema.parse(input.evento), ctx.lang) : undefined;
        const ev = await db.query.events.findFirst({ where: eq(events.id, ctx.eventId) });
        if (!ev) throw new Error("Evento não encontrado");
        const validSet = new Set((await getActiveCategories()).map((c) => c.slug));
        const unknown = input.itens.filter((i) => !validSet.has(i.categoria_slug)).map((i) => i.categoria_slug);
        const plan = await computePlan({
          items: input.itens.filter((i) => validSet.has(i.categoria_slug)).map((i) => ({ slug: i.categoria_slug, priority: i.prioridade, rationale: i.motivo })),
          guests: ev.guests,
          budget: ev.budgetTotal,
          eventTypeLabel: eventTypeLabel(ev.type, ctx.lang),
          lang: ctx.lang,
        });
        const saved = await savePlan(ctx.eventId, plan, "AI", PROMPT_VERSION);
        ui.plan = { ...plan, version: saved.version };
        // Busca automática (em paralelo) das essenciais: poupa uma rodada inteira do modelo
        let fornecedores: unknown;
        if (input.buscar_fornecedores !== false && ev.locationId) {
          const essentials = plan.lines.filter((l) => l.priority === "ESSENTIAL").slice(0, 4);
          const found = await Promise.all(essentials.map((l) => runSearch(ev, l.slug, { budgetMax: l.allocated, limit: 4, lang: ctx.lang }, ui)));
          fornecedores = found.filter(Boolean);
        }
        return {
          result: {
            evento: input.evento ? await eventSnapshot(ctx.eventId) : undefined,
            aviso_local: aviso,
            versao: saved.version,
            resumo: plan.summary,
            itens: plan.lines.map((l) => ({
              categoria: l.slug,
              nome: l.name,
              prioridade: l.priority,
              estimativa_reais: [l.estMin / 100, l.estMax / 100],
              verba_sugerida_reais: l.allocated / 100,
            })),
            reserva_imprevistos_reais: plan.reserve / 100,
            alertas: plan.warnings,
            dicas_economia: plan.savingsTips,
            categorias_desconhecidas_ignoradas: unknown,
            fornecedores_por_categoria: fornecedores ?? (ev.locationId ? "não buscados" : "não buscados: bairro ainda não informado"),
            observacao: "Valores são ESTIMATIVAS de referência, não orçamentos de fornecedores.",
          },
        };
      }

      case "buscar_fornecedores": {
        const input = searchSchema.parse(rawInput);
        const ev = await db.query.events.findFirst({ where: eq(events.id, ctx.eventId) });
        if (!ev) throw new Error("Evento não encontrado");
        const res = await runSearch(
          ev,
          input.categoria_slug,
          { budgetMax: input.budget_max_reais != null ? Math.round(input.budget_max_reais * 100) : null, query: input.termo, limit: input.limite ?? 4, lang: ctx.lang },
          ui,
        );
        if (!res) return { result: { erro: `Categoria '${input.categoria_slug}' não existe no catálogo.` }, isError: true };
        return { result: res };
      }

      case "verificar_disponibilidade": {
        const input = availSchema.parse(rawInput);
        const provs = await db.select({ id: providers.id, slug: providers.slug, name: providers.tradeName }).from(providers).where(inArray(providers.slug, input.fornecedores_slugs));
        const blocked = provs.length
          ? await db.select({ providerId: availability.providerId, status: availability.status }).from(availability).where(and(eq(availability.date, input.data), inArray(availability.providerId, provs.map((p) => p.id))))
          : [];
        return {
          result: {
            data: input.data,
            resultado: provs.map((p) => ({
              slug: p.slug,
              nome: p.name,
              status: blocked.some((b) => b.providerId === p.id) ? "indisponível (data bloqueada na agenda)" : "sem bloqueio na agenda — confirmar ao pedir orçamento",
            })),
            nao_encontrados: input.fornecedores_slugs.filter((s) => !provs.some((p) => p.slug === s)),
          },
        };
      }
      default:
        return { result: { erro: `Ferramenta desconhecida: ${name}` }, isError: true };
    }
  } catch (e) {
    const msg = e instanceof z.ZodError ? `Parâmetros inválidos: ${e.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}` : (e as Error).message;
    return { result: { erro: msg }, isError: true };
  }
}

export async function planStateText(eventId: string): Promise<string> {
  const p = await latestPlan(eventId);
  if (!p) return "Nenhum planejamento gerado ainda.";
  return `Versão ${p.version}: ${p.summary}\nItens: ${p.items.map((i) => `${i.category.slug} (${i.priority})`).join(", ")}`;
}
