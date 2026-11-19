import "server-only";
import { eq } from "drizzle-orm";
import { formatBRL } from "@/lib/format";
import { db } from "../db";
import { events, locations } from "../db/schema";
import { DEFAULT_PACKAGES, latestPlan, type EventTypeKey, type Priority } from "../services/planning";
import type { EngineResult, EngineRun, PlannerEngine } from "./engines";
import { extractEventInfo, matchLocation } from "./extract";
import { eventSnapshot, executeTool } from "./tools";

/**
 * MODO DEMONSTRAÇÃO — funciona sem chave de API.
 * Extrai dados por regras, chama as MESMAS ferramentas do agente com LLM (mesmo catálogo real,
 * mesmo cálculo de estimativas). Serve para desenvolvimento, testes automatizados e fallback.
 */
export class RulesEngine implements PlannerEngine {
  id = "demo-rules";
  model = "demo-rules";

  async run({ userMessage, ctx, ui }: EngineRun): Promise<EngineResult> {
    const toolCalls: EngineResult["toolCalls"] = [];
    const call = async (name: string, input: unknown) => {
      const r = await executeTool(name, input, ctx, ui);
      toolCalls.push({ name, input, result: r.result });
      return r.result as Record<string, unknown>;
    };

    const before = await eventSnapshot(ctx.eventId);
    const ex = extractEventInfo(userMessage);
    const msgNorm = userMessage.trim();

    // Respostas curtas a perguntas anteriores ("80", "Tijuca", "12 mil")
    if (!ex.guests && /^\d{1,4}$/.test(msgNorm) && !before.convidados) ex.guests = Number(msgNorm);
    if (!ex.budgetCents && /^\s*r?\$?\s*[\d.,]+\s*(mil|k)?\s*$/i.test(msgNorm) && before.convidados && !before.orcamento_total_reais) {
      const m = msgNorm.toLowerCase().match(/([\d.,]+)\s*(mil|k)?/);
      if (m) ex.budgetCents = Math.round(Number(m[1].replace(/\.(?=\d{3})/g, "").replace(",", ".")) * (m[2] ? 1000 : 1) * 100);
    }
    let locationName: string | undefined = ex.locationHint;
    if (!locationName) {
      const all = await db.select({ id: locations.id, name: locations.name, city: locations.city }).from(locations).where(eq(locations.active, true));
      const words = msgNorm.length <= 40 ? msgNorm : "";
      const hit = words ? matchLocation(words, all) : null;
      if (hit) locationName = hit.precision === "city" ? hit.loc.city : hit.loc.name;
      else {
        // compara sem acentos: \b não funciona com letras acentuadas
        const plain = ` ${stripAccents(userMessage).toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
        const sorted = [...all].sort((a, b) => b.name.length - a.name.length);
        const byName = sorted.find((l) => l.name !== "Centro" && plain.includes(` ${stripAccents(l.name).toLowerCase()} `));
        const byCity = byName ? null : sorted.find((l) => l.city !== "Rio de Janeiro" && plain.includes(` ${stripAccents(l.city).toLowerCase()} `));
        if (byName) locationName = byName.name;
        else if (byCity) locationName = byCity.city;
      }
    }

    const prefs = (before.preferencias ?? {}) as Record<string, unknown>;
    const desired = new Set<string>([...((prefs.servicos_desejados as string[]) ?? []), ...ex.serviceKeywords]);
    const removed = new Set<string>([...((prefs.servicos_removidos as string[]) ?? []), ...ex.removeKeywords]);
    for (const r of ex.removeKeywords) desired.delete(r);
    for (const d of ex.serviceKeywords) if (!ex.removeKeywords.includes(d)) removed.delete(d);

    const update: Record<string, unknown> = {};
    if (ex.type) update.tipo = ex.type;
    if (ex.guests) update.convidados = ex.guests;
    if (ex.budgetCents) update.orcamento_total_reais = ex.budgetCents / 100;
    if (ex.date) update.data = ex.date;
    if (/data (ainda )?(a definir|flexivel|em aberto)|nao sei a data|sem data/i.test(userMessage.normalize("NFD").replace(/[̀-ͯ]/g, ""))) update.data_flexivel = true;
    if (locationName) update.bairro_ou_cidade = locationName;
    if (ex.hasVenue != null) update.ja_tem_local = ex.hasVenue;
    update.preferencias = { servicos_desejados: [...desired], servicos_removidos: [...removed] };
    const upd = await call("atualizar_evento", update);
    const snap = (upd.evento ?? before) as Awaited<ReturnType<typeof eventSnapshot>>;

    // Pedido de "mais opções" de uma categoria já planejada
    const wantsMore = /(mais|outras|outros)\s+(opcoes|opções|fornecedores|sugest)/i.test(userMessage);
    const plan = await latestPlan(ctx.eventId);
    if (wantsMore && plan && ex.serviceKeywords.length) {
      const slug = ex.serviceKeywords[0];
      const item = plan.items.find((i) => i.category.slug === slug);
      await call("buscar_fornecedores", { categoria_slug: slug, budget_max_reais: item ? item.allocated / 100 : undefined, limite: 6 });
      return this.finish(toolCalls, ui, "Aqui estão mais opções cadastradas para essa categoria, já filtradas pela sua região, data e número de convidados.");
    }

    // Perguntas naturais quando faltam dados essenciais (máx. 3)
    const questions: string[] = [];
    if (snap.tipo === "OUTRO" && !ex.type) questions.push("que tipo de festa você está planejando (aniversário, casamento, 15 anos, chá de bebê…)?");
    if (!snap.local_reconhecido) {
      const aviso = String(upd.aviso_local ?? "");
      questions.push(
        aviso.startsWith("Cidade reconhecida")
          ? "em qual bairro do Rio vai ser? Assim eu encontro fornecedores que atendem perto de você."
          : aviso
            ? "em qual bairro ou cidade da Região Metropolitana do Rio vai ser? (por enquanto atendemos só essa região)"
            : "em qual bairro ou cidade vai ser a festa?",
      );
    }
    if (!snap.convidados) questions.push("quantas pessoas você pretende convidar?");
    if (!snap.orcamento_total_reais && questions.length < 3) questions.push("qual é o orçamento total que você quer investir?");
    if (!snap.data && !snap.data_flexivel && questions.length < 3) questions.push("já tem uma data em mente? (se ainda não, tudo bem)");
    if (snap.ja_tem_local == null && snap.tipo !== "OUTRO" && questions.length < 3 && !removed.has("espaco-de-festas")) questions.push("você já tem um local definido ou quer sugestões de espaço?");

    const essentialMissing = snap.tipo === "OUTRO" || !snap.local_reconhecido || !snap.convidados;
    if (essentialMissing || (!snap.orcamento_total_reais && !plan)) {
      const intro = before.convidados || before.local_reconhecido ? "Anotado!" : "Que legal, vamos planejar juntos!";
      const known = describeKnown(snap);
      return this.finish(
        toolCalls,
        ui,
        `${intro}${known ? ` Até aqui tenho: ${known}.` : ""} Antes de montar o planejamento e procurar fornecedores, me conta: ${joinQuestions(questions.slice(0, 3))}`,
      );
    }

    // Monta o planejamento
    const type = snap.tipo as EventTypeKey;
    const items: { categoria_slug: string; prioridade: Priority; motivo?: string }[] = [];
    for (const d of desired) items.push({ categoria_slug: d, prioridade: "ESSENTIAL", motivo: "Você pediu este serviço" });
    // Serviços que se substituem: se a pessoa escolheu um, não sugerimos o outro
    const SUBSTITUTES: Record<string, string[]> = { churrasco: ["buffet"], "food-trucks": ["buffet"], "sitios-e-chacaras": ["espaco-de-festas"] };
    const replaced = new Set([...desired].flatMap((d) => SUBSTITUTES[d] ?? []));
    for (const p of DEFAULT_PACKAGES[type] ?? DEFAULT_PACKAGES.OUTRO) {
      if (items.some((i) => i.categoria_slug === p.slug) || replaced.has(p.slug)) continue;
      // Quando a pessoa listou o que quer, o restante do pacote vira sugestão (exceto o local)
      let prioridade = p.priority;
      if (desired.size && p.slug !== "espaco-de-festas") prioridade = p.priority === "ESSENTIAL" ? "RECOMMENDED" : "OPTIONAL";
      items.push({ categoria_slug: p.slug, prioridade, motivo: desired.size ? "Sugestão comum para este tipo de festa" : undefined });
    }
    const final = items.filter((i) => !removed.has(i.categoria_slug) && !(snap.ja_tem_local && i.categoria_slug === "espaco-de-festas"));
    const planRes = await call("montar_planejamento", { itens: final });
    const planItems = (planRes.itens as { categoria: string; nome: string; prioridade: string; verba_sugerida_reais: number }[]) ?? [];

    // Busca fornecedores: pedidos explícitos primeiro, depois essenciais (até 4)
    const toSearch = [
      ...planItems.filter((i) => desired.has(i.categoria)),
      ...planItems.filter((i) => !desired.has(i.categoria) && i.prioridade === "ESSENTIAL"),
    ].slice(0, 4);
    const found: string[] = [];
    const empty: string[] = [];
    let anyDemo = false;
    for (const it of toSearch) {
      const r = await call("buscar_fornecedores", { categoria_slug: it.categoria, budget_max_reais: it.verba_sugerida_reais, limite: 4 });
      const n = Number(r.encontrados ?? 0);
      if ((r.fornecedores as { is_demo: boolean }[] | undefined)?.some((f) => f.is_demo)) anyDemo = true;
      (n > 0 ? found : empty).push(`${it.nome}${n > 0 ? ` (${n})` : ""}`);
    }

    const ev = await db.query.events.findFirst({ where: eq(events.id, ctx.eventId) });
    const parts: string[] = [];
    const opening = `Montei um planejamento para ${describeKnown(snap)}.`;
    if (ev?.budgetTotal) parts.push(`${opening} Distribuí os ${formatBRL(ev.budgetTotal)} entre os serviços e deixei uma reserva para imprevistos — os valores são estimativas de referência, não orçamentos.`);
    else parts.push(`${opening} Os valores são estimativas de referência. Se me disser o orçamento total, eu distribuo a verba entre os serviços.`);
    const warnings = (planRes.alertas as string[]) ?? [];
    if (warnings.length) parts.push(`⚠️ ${warnings[0]}`);
    if (found.length) parts.push(`Encontrei fornecedores cadastrados que atendem sua região para: ${found.join(", ")}.`);
    if (empty.length) parts.push(`Ainda não temos fornecedores compatíveis para ${empty.join(", ")} nessa região/data. Posso procurar em bairros vizinhos ou você pode deixar essa categoria para depois.`);
    if (anyDemo) parts.push("Atenção: os fornecedores exibidos nesta versão de teste são exemplos de demonstração.");
    parts.push('Revise os cards e toque em "Solicitar orçamento" nos que te interessarem. Quer tirar algum serviço ou mudar o orçamento?');

    return this.finish(toolCalls, ui, parts.join("\n\n"));
  }

  private finish(toolCalls: EngineResult["toolCalls"], _ui: unknown, text: string): EngineResult {
    return { text, inputTokens: 0, outputTokens: 0, toolCalls };
  }
}

function describeKnown(s: Awaited<ReturnType<typeof eventSnapshot>>): string {
  const bits: string[] = [];
  if (s.tipo !== "OUTRO") bits.push(s.tipo_label.toLowerCase());
  if (s.convidados) bits.push(`${s.convidados} pessoas`);
  if (s.local_reconhecido && s.local) bits.push(`em ${s.local}`);
  if (s.orcamento_total_reais) bits.push(`orçamento de ${formatBRL(s.orcamento_total_reais * 100)}`);
  if (s.data) bits.push(`no dia ${new Date(`${s.data}T12:00:00`).toLocaleDateString("pt-BR")}`);
  return bits.join(", ");
}

function joinQuestions(qs: string[]): string {
  const cap = (q: string) => q.charAt(0).toUpperCase() + q.slice(1);
  return qs.map((q, i) => (i === 0 ? q : i === qs.length - 1 ? `E ${q}` : cap(q))).join(" ");
}

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
