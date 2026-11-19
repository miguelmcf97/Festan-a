import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { executeTool, TOOL_DEFS, type ToolContext, type UiPayload } from "./tools";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type EngineRun = {
  system: string;
  history: ChatTurn[];
  userMessage: string;
  ctx: ToolContext;
  ui: UiPayload;
};
export type EngineResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  toolCalls: { name: string; input: unknown; result: unknown }[];
};

/** Interface independente do fornecedor de LLM. Trocar de modelo/fornecedor = nova implementação. */
export interface PlannerEngine {
  id: string;
  model: string;
  run(args: EngineRun): Promise<EngineResult>;
}

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

  async run({ system, history, userMessage, ctx, ui }: EngineRun): Promise<EngineResult> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];
    const toolCalls: EngineResult["toolCalls"] = [];
    let inputTokens = 0,
      outputTokens = 0;
    const texts: string[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        // O prompt de sistema é estável dentro de uma conversa → cache reduz custo de entrada
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: TOOL_DEFS as unknown as Anthropic.Tool[],
        messages,
      });
      inputTokens += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
      outputTokens += res.usage.output_tokens;

      const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      for (const b of res.content) if (b.type === "text" && b.text.trim()) texts.push(b.text.trim());
      if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

      messages.push({ role: "assistant", content: res.content as Anthropic.ContentBlockParam[] });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const { result, isError } = await executeTool(tu.name, tu.input, ctx, ui);
        toolCalls.push({ name: tu.name, input: tu.input, result });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result), is_error: isError });
      }
      messages.push({ role: "user", content: results });
      texts.length = 0; // só a fala final vai para o cliente
    }

    return {
      text: texts.join("\n\n") || "Atualizei seu planejamento. Dá uma olhada nos detalhes abaixo.",
      inputTokens,
      outputTokens,
      toolCalls,
    };
  }
}

export async function getEngine(): Promise<PlannerEngine> {
  const provider = process.env.AI_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : "demo-rules");
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicEngine(process.env.AI_MODEL ?? "claude-sonnet-5-5", process.env.ANTHROPIC_API_KEY);
  }
  const { RulesEngine } = await import("./rules-engine");
  return new RulesEngine();
}
