// Imita POST /v1/messages (stream SSE) da API do Claude para testes locais.
import http from "node:http";
import fs from "node:fs";
const log = [];
const sse = (res, ev, data) => res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  const b = JSON.parse(body || "{}");
  log.push({ path: req.url, stream: b.stream, systemBlocks: (b.system || []).map((s) => ({ cache: !!s.cache_control, len: s.text.length, head: s.text.slice(0, 30) })), nMsgs: b.messages?.length, max_tokens: b.max_tokens });
  fs.writeFileSync("/tmp/mock-log.json", JSON.stringify(log, null, 1));
  const last = b.messages[b.messages.length - 1];
  const hasToolResult = Array.isArray(last.content) && last.content.some((c) => c.type === "tool_result");
  res.writeHead(200, { "Content-Type": "text/event-stream" });
  await new Promise((r) => setTimeout(r, 400));
  sse(res, "message_start", { type: "message_start", message: { id: "msg_" + log.length, type: "message", role: "assistant", model: b.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1, cache_read_input_tokens: 900 } } });
  if (!hasToolResult) {
    const input = { evento: { tipo: "ANIVERSARIO_INFANTIL", bairro_ou_cidade: "Jacarepaguá", convidados: 80, orcamento_total_reais: 8000 },
      itens: [{ categoria_slug: "churrasco", prioridade: "ESSENTIAL" }, { categoria_slug: "brinquedos-inflaveis", prioridade: "ESSENTIAL" }, { categoria_slug: "decoracao", prioridade: "ESSENTIAL" }, { categoria_slug: "doces-e-bolos", prioridade: "RECOMMENDED" }, { categoria_slug: "espaco-de-festas", prioridade: "OPTIONAL" }] };
    sse(res, "content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "toolu_1", name: "montar_planejamento", input: {} } });
    sse(res, "content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(input) } });
    sse(res, "content_block_stop", { type: "content_block_stop", index: 0 });
    sse(res, "message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 120 } });
  } else {
    const tr = JSON.parse(last.content[0].content);
    const found = (tr.fornecedores_por_categoria || []).map((c) => `${c.categoria}: ${c.encontrados}`).join(", ");
    const words = `Montei o planejamento (estimativas). Encontrei fornecedores: ${found}. Revise os cards e peça orçamentos.`.split(" ");
    sse(res, "content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
    for (const w of words) { sse(res, "content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: w + " " } }); await new Promise((r) => setTimeout(r, 30)); }
    sse(res, "content_block_stop", { type: "content_block_stop", index: 0 });
    sse(res, "message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 60 } });
  }
  sse(res, "message_stop", { type: "message_stop" });
  res.end();
}).listen(4010, () => console.log("mock on 4010"));
