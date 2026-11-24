# Plano de testes

> Última revisão: 19/11/2026

## 1. Automatizados (executados nesta etapa)

| Suíte | Comando | Cobre | Resultado em 19/11/2026 |
|---|---|---|---|
| Tipos | `npm run typecheck` | Projeto inteiro | ✅ sem erros |
| Build de produção | `npm run build` | 26 rotas + proxy | ✅ |
| Unitários (vitest) | `npm test` | Máquina de estados (contratação só a partir de proposta aceita; estados finais), CPF/CNPJ, conversão de valores, extração do pedido em linguagem natural, datas, resolução de bairro, distância | ✅ 17/17 |
| E2E (Playwright) | `python3 tests/e2e.py` com o servidor em `localhost:3000` e seed demo | Jornada completa (abaixo) | ✅ sem erros de JavaScript |
| Saúde / cabeçalhos | `curl /api/health`, `curl -I /` | Banco acessível; CSP, HSTS, X-Frame-Options | ✅ |

**Roteiro E2E automatizado:**
1. Home renderiza (desktop e mobile).
2. Visitante sem conta escreve o exemplo do briefing (aniversário infantil, 80 pessoas, "Rio de Janeiro", R$ 8 mil, brinquedos/churrasco/decoração/música) → IA pergunta o bairro.
3. Responde "Jacarepaguá, dia 20/12. Ainda não tenho local" → plano + cards de fornecedores reais por categoria.
4. Seleciona 2 fornecedores → "Pedir orçamentos" → pede login → login preserva a conversa → envia 2 solicitações.
5. Fornecedor envia proposta → cliente aceita → tela mostra "não está confirmada" (reserva).
6. Fornecedor confirma → cliente vê "Contato do fornecedor" (liberado só após confirmação).
7. Admin aprova fornecedor pendente; páginas de admin respondem 200.

Em 23/11/2026 (prompt v1.1): E2E completo de novo sem erros; caminho com LLM testado com o simulador da API (`tests/mock-anthropic.mjs`): 2 rodadas, evento + plano + 3 buscas em paralelo numa chamada, texto transmitido, parte fixa do prompt com `cache_control`. No site publicado com o Claude real: 13,9 s (antes 25,2 s).

Em 24/11/2026 (prompt v1.2, Haiku, idiomas, agenda, categoria única, limite de 3 mensagens): tipos ✅, build ✅, unitários ✅ 24/24 (novos: idioma, rótulos, datas, mensagens traduzidas), E2E ✅ sem erros de JavaScript, com os passos novos:
8. Fornecedor abre a agenda: a data da festa confirmada aparece **Fechada**; um toque bloqueia e outro libera um dia; bloqueio de período de 3 dias.
9. Perfil do fornecedor tem uma única categoria marcada (rádio) e o formulário de serviço não pede categoria.
10. Admin: aprova na aba "Aprovar", concede selo na aba "Verificar", remove na aba "Remover selo"; lista ordenada pela data da solicitação; campo do limite de IA mostra 3.
11. Troca para inglês (menu, páginas do admin) e volta para português.
12. Visitante novo: contador "3 de 3", envia 3 mensagens, o campo some com o aviso de limite e a API responde 429 `AI_LIMIT` à 4ª.
Com o simulador da API: a requisição sai com `claude-haiku-5-5`, idioma `en` e "mensagens restantes" no prompt; o plano volta em inglês. Também testada a migração de categoria única sobre a base antiga (41 vínculos → 31, 9 serviços desativados, nada apagado).

Bugs encontrados e corrigidos pelos testes: bairro com acento seguido de vírgula ("Jacarepaguá,") não era reconhecido; "ainda não tenho local" virava local "local"; resposta da IA sem quebra de parágrafo; painel do plano cortado em telas baixas.

## 2. Checklist manual antes de cada release

**Consumidor**
- [ ] Planejar sem conta; recarregar a página (`?c=`) mantém a conversa.
- [ ] Pedir "tira a fotografia", "orçamento de R$ 10 mil", "mais opções de decoração" → plano e cards atualizam.
- [ ] Bairro fora da RM (ex.: "Petrópolis") → IA avisa a área de cobertura.
- [ ] Solicitar orçamento pelo perfil do fornecedor com evento novo e com evento existente.
- [ ] Solicitação duplicada (mesmo evento, fornecedor e categoria) é recusada com mensagem clara.
- [ ] Comparar propostas com 2+ propostas na mesma categoria.
- [ ] Proposta expirada não pode ser aceita.
- [ ] Cancelar solicitação com reserva → data volta a ficar livre na agenda.

**Fornecedor**
- [ ] Cadastro com CPF/CNPJ inválido é bloqueado; válido → "em análise".
- [ ] Fornecedor pendente não aparece no catálogo nem na IA.
- [ ] Bloquear data → some das buscas para essa data; data BOOKED não pode ser liberada.
- [ ] Concluir antes da data do evento é bloqueado.

**Admin**
- [ ] Nova categoria aparece na home, no filtro e no catálogo da IA (sem deploy).
- [ ] Rejeitar avaliação recalcula a nota.
- [ ] Suspender usuário encerra as sessões dele.

**Segurança**
- [ ] Acessar `/painel/solicitacoes/<id de outro cliente>` → 404.
- [ ] Acessar `/admin` como cliente → "acesso negado".
- [ ] `/entrar?next=//site-externo` não redireciona para fora.
- [ ] 9ª tentativa de login errado em 15 min → bloqueio temporário.
- [ ] 31ª mensagem à IA na hora → 429 com mensagem amigável.

**Acessibilidade e responsividade**
- [ ] Navegação completa por teclado (foco visível em amarelo); diálogo fecha com Esc.
- [ ] 390 px de largura: home, chat, perfil, painéis sem rolagem horizontal.
- [ ] `prefers-reduced-motion` desativa animações.

## 3. Avaliação da IA com LLM real (Sprint 1)

Conjunto de 50 conversas-roteiro (10 por ocasião: infantil, 15 anos, casamento, chá, corporativo), incluindo casos difíceis: orçamento impossível, bairro fora da área, data com fornecedores bloqueados, pedido fora do escopo, tentativa de obter dados de outro cliente, pedido para "inventar" fornecedores.

| Critério | Como medir | Meta |
|---|---|---|
| Fornecedor citado existe e veio da busca | Comparar nomes no texto com resultados de `buscar_fornecedores` no log `ai_messages` | 100% |
| Valores citados = valores da ferramenta | Comparar números do texto com `montar_planejamento` | 100% |
| Usa "estimativa" ao falar de valores | Verificação de texto + revisão humana | 100% |
| Perguntas por mensagem | Contagem | ≤ 3 |
| Conversa → plano em até 3 turnos (com dados completos) | Log | ≥ 90% |
| Custo médio por conversa | `ai_conversations.cost_micro_usd` | ≤ US$ 0,20 |
| Satisfação (revisão humana 1–5) | 2 avaliadores | ≥ 4,2 |

Cada nova versão de prompt (`PROMPT_VERSION`) roda o conjunto inteiro antes de ir para produção.

## 4. Validação com usuários (piloto)

- 8 entrevistas moderadas com pais/mães organizando festas na RM (teste da jornada com o protótipo).
- 8 entrevistas com fornecedores (cadastro, resposta a pedido, proposta).
- Métricas de sucesso do piloto em `ESTRATEGIA_DE_GO_TO_MARKET.md` §4.
