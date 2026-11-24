import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { executeTool, TOOL_DEFS, type ToolContext, type UiPayload } from "./tools";

export type ChatTurn = { role: "user" | "assistant"; content: string };
/** Eventos de progresso enviados à tela enquanto a IA trabalha. */
export type EngineEvents = {
  /** Código da etapa (ex.: "reading", "tool:montar_planejamento", "writing"); a tela traduz. */
  onStatus?: (code: string) => void;
  onText?: (delta: string) => void;
  onReset?: () => void; // texto transmitido não era a resposta final (veio antes de ferramentas)
};
export type EngineRun = {
  system: { cached: string; dynamic: string };
  history: ChatTurn[];
  userMessage: string;
  ctx: ToolContext;
  ui: UiPayload;
  events?: EngineEvents;
};
export type EngineResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  toolCalls: { name: string; input: unknown; result: unknown }[];
  timings?: { llmMs: number; toolsMs: number; rounds: number };
};

/** Interface independente do fornecedor de LLM. Trocar de modelo/fornecedor = nova implementação. */
export interface PlannerEngine {
  id: string;
  model: string;
  run(args: EngineRun): Promise<EngineResult>;
}

/** Modelo padrão: Claude Haiku 5.5 — mais rápido e ~20× mais barato que o Sonnet. Trocar com AI_MODEL. */
export const DEFAULT_MODEL = "claude-haiku-5-5";

// Preços por milhão de tokens (USD). Atualizar quando a tabela do fornecedor mudar.
// Fonte: página de preços da API Claude (nov/2026). Ver docs/PLANO_FINANCEIRO.md.
export const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-opus-5-5": { in: 4, out: 20 },
  "demo-rules": { in: 0, out: 0 },
};

export function costMicroUsd(model: string, inTok: number, outTok: number) {
  const p = MODEL_PRICES[model] ?? { in: 2, out: 10 };
  return Math.round(inTok * p.in + outTok * p.out); // (tok/1e6 * USD) * 1e6 = tok * USD
}

const MAX_TOOL_ROUNDS = 6;

export class AnthropicEngine implements PlannerEngine {
  id = "anthropic";
  private client: Anthropic;
  constructor(public model: string, apiKey: string) {
    this.client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });
  }

  async run({ system, history, userMessage, ctx, ui, events }: EngineRun): Promise<EngineResult> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];
    const toolCalls: EngineResult["toolCalls"] = [];
    let inputTokens = 0,
      outputTokens = 0,
      llmMs = 0,
      toolsMs = 0,
      rounds = 0;
    let finalText = "";
    events?.onStatus?.("reading");

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      rounds++;
      const t0 = Date.now();
      let streamed = "";
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 900,
        // Parte fixa (instruções + catálogo) em cache; estado do evento muda a cada mensagem e fica fora.
        system: [
          { type: "text", text: system.cached, cache_control: { type: "ephemeral" } },
          { type: "text", text: system.dynamic },
        ],
        tools: TOOL_DEFS as unknown as Anthropic.Tool[],
        messages,
      });
      stream.on("text", (delta) => {
        streamed += delta;
        events?.onText?.(delta);
      });
      const res = await stream.finalMessage();
      llmMs += Date.now() - t0;
      inputTokens += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
      outputTokens += res.usage.output_tokens;

      const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
        finalText = res.content.flatMap((b) => (b.type === "text" ? [b.text.trim()] : [])).filter(Boolean).join("\n\n");
        break;
      }
      if (streamed.trim()) events?.onReset?.();

      messages.push({ role: "assistant", content: res.content as Anthropic.ContentBlockParam[] });
      const t1 = Date.now();
      // Atualizações do evento primeiro (as demais ferramentas dependem delas); o resto em paralelo.
      const results = new Map<string, Anthropic.ToolResultBlockParam>();
      const run = async (tu: Anthropic.ToolUseBlock) => {
        events?.onStatus?.(`tool:${tu.name}`);
        const { result, isError } = await executeTool(tu.name, tu.input, ctx, ui);
        toolCalls.push({ name: tu.name, input: tu.input, result });
        results.set(tu.id, { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result), is_error: isError });
      };
      for (const tu of toolUses.filter((t) => t.name === "atualizar_evento")) await run(tu);
      await Promise.all(toolUses.filter((t) => t.name !== "atualizar_evento").map(run));
      toolsMs += Date.now() - t1;
      messages.push({ role: "user", content: toolUses.map((tu) => results.get(tu.id)!) });
      events?.onStatus?.("writing");
    }

    return {
      text: finalText || (ctx.lang === "en" ? "I updated your plan. Take a look at the details below." : "Atualizei seu planejamento. Dá uma olhada nos detalhes abaixo."),
      inputTokens,
      outputTokens,
      toolCalls,
      timings: { llmMs, toolsMs, rounds },
    };
  }
}

export async function getEngine(): Promise<PlannerEngine> {
  const provider = process.env.AI_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : "demo-rules");
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicEngine(process.env.AI_MODEL || DEFAULT_MODEL, process.env.ANTHROPIC_API_KEY);
  }
  const { RulesEngine } = await import("./rules-engine");
  return new RulesEngine();
}
