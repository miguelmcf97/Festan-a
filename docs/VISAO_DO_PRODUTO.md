# Visão do produto — Planfest

> Última revisão: 19/11/2026 · Status: MVP navegável (protótipo funcional com dados de demonstração)

## 1. Diagnóstico do projeto original (Lovable — "Festança")

**Como foi analisado.** O projeto `ffff4a25-…` no Lovable é privado. O repositório GitHub `miguelmcf97/Festan-a` está vazio (sem commits). A análise foi feita pelo histórico do projeto no editor do Lovable (acesso pelo navegador do app, logado na conta do dono). O código-fonte não foi lido arquivo a arquivo; para isso é preciso conectar o projeto ao GitHub (botão GitHub → Connect no Lovable).

**O que existe (segundo o histórico do Lovable, out/2026):**

| Funcionalidade | Situação no Festança | Aproveitamento no Planfest |
|---|---|---|
| Página inicial com categorias e prestadores mais bem avaliados | Pronta | Conceito mantido, refeito com dados reais do banco e contagem por categoria |
| Lista de prestadores com busca e filtro por categoria | Pronta | Ampliada: filtro por bairro (raio de atendimento), data (agenda), convidados e verificados |
| Página do prestador com "Solicitar orçamento" (data, convidados, detalhes) | Pronta | Mantida e ligada a "eventos" do cliente |
| Assistente de IA "Fê" (tipo, convidados, orçamento → checklist com estimativa e prestadores cadastrados) | Pronta; teve tela branca corrigida (erro de rolagem) | Refeita com arquitetura independente de fornecedor de LLM, ferramentas sobre o catálogo real, cálculo de estimativas no servidor e modo demonstração |
| "Sou prestador": qualquer conta publica serviço | Pronta | Substituída por cadastro com CPF/CNPJ validado, aprovação do admin e selo de verificado |
| "Minha conta": cliente acompanha pedidos; prestador aceita ou recusa | Pronta (aceitar/recusar) | Ampliada para o ciclo completo: solicitação → proposta → reserva → contratação → conclusão → avaliação |
| Login por e-mail/senha e Google, com confirmação de e-mail | Pronta | E-mail/senha implementado; Google e confirmação de e-mail ficam no roadmap (Fase 2) |
| 12 prestadores fictícios | Sem dono — pedidos não chegam a ninguém | 31 fornecedores demo com donos, histórico e avaliações ligadas a contratações, todos sinalizados como demonstração |
| Sitemap | Pronto | No roadmap (Fase 2, junto com SEO das páginas de fornecedor) |
| Plano de negócios em PDF (comissão 10–15% + plano "Destaque") | Estimativas próprias do Lovable, sem fontes | Refeito com fontes datadas e modelo financeiro reproduzível |

**Stack (inferida, não confirmada no código):** a URL publicada (`*.lovable.app/assets/index-*.js`) indica React + Vite; login com Google e confirmação por e-mail sugerem Supabase/Lovable Cloud. Lacunas que motivaram a reconstrução:

1. **Sem SSR** — páginas de fornecedor não são indexáveis de forma confiável (SEO é canal-chave de aquisição local).
2. **Dependência de serviço gerenciado** — difícil de hospedar na VPS conforme o briefing.
3. **Fluxo comercial curto** — não diferencia solicitação, proposta, reserva e contratação.
4. **Qualquer conta publica serviço** — sem aprovação nem verificação, o que compromete a confiança.

**Decisão aprovada:** reconstruir em Next.js + PostgreSQL, preservando os conceitos e a jornada do Festança. Se o código for sincronizado ao GitHub, componentes visuais e textos podem ser portados.

## 2. Visão

> **Você imagina a festa. Nossa inteligência artificial ajuda a planejar. Nossa plataforma encontra quem pode realizar.**

Planfest é o marketplace de serviços para festas e eventos sociais com uma consultora de planejamento por IA. O consumidor descreve a festa em linguagem natural; a IA transforma isso em um plano (serviços por prioridade, estimativas, divisão do orçamento) e recomenda fornecedores **reais** cadastrados que atendem o bairro, a data e a faixa de preço. O fornecedor recebe pedidos qualificados e responde com propostas pelo painel.

**Em 3 anos:** a forma padrão de organizar festas de pequeno e médio porte no Sudeste, começando pela Região Metropolitana do Rio.

**Princípios de produto** (não negociáveis — ver `CLAUDE.md`):
1. A IA nunca inventa fornecedor, preço, avaliação ou disponibilidade.
2. Estimativa ≠ orçamento ≠ proposta ≠ contratação.
3. Liquidez antes de monetização.
4. Cadastro do fornecedor simples; confiança por verificação e avaliações autênticas.

## 3. Jornada do consumidor

| Etapa | O que a pessoa faz | O que o sistema faz | Tela |
|---|---|---|---|
| 1. Entrada | Lê a proposta, escolhe "planejar" (caixa de texto no hero) ou "encontrar fornecedores" | Sem cadastro para começar | `/` |
| 2. Conversa | Escreve livremente (ex.: "aniversário infantil, 80 pessoas, Rio, R$ 8 mil, brinquedos e churrasco") | IA extrai tipo, convidados, orçamento, serviços; pergunta o que falta (máx. 3 perguntas, ex.: bairro, data, se já tem local) | `/planejar` |
| 3. Planejamento | Vê o plano: essenciais/recomendados/opcionais, estimativa por item, verba sugerida, reserva de 8%, alertas e dicas de economia | Estimativas calculadas no servidor a partir de parâmetros de categoria (editáveis no admin); versão do plano salva | painel lateral |
| 4. Recomendações | Vê cards por categoria com motivos ("atende Jacarepaguá", "verificado") e pontos de atenção ("preço acima da verba") | Busca filtra por raio/área, agenda, capacidade; ordena por nota (suavizada), distância, verificação, taxa de resposta e preço | cards no chat |
| 5. Ajustes | "Tira a fotografia", "aumenta para R$ 10 mil", "mais opções de decoração" | Atualiza evento, refaz plano e buscas | chat |
| 6. Solicitação | Seleciona vários fornecedores → "Pedir orçamentos" → cria conta (a conversa é preservada) → revisa texto pré-preenchido → envia | Uma solicitação por fornecedor/categoria; fornecedor notificado | diálogo |
| 7. Comparação | Recebe propostas, compara valor, itens inclusos, condições e diferença para a verba | Notificações; tabela por categoria | `/painel`, `/painel/eventos/[id]` |
| 8. Contratação | Aceita uma proposta → **reserva** (aguardando fornecedor) → fornecedor confirma → **contratação confirmada**; contato liberado | Demais propostas da mesma solicitação recusadas; data bloqueada na agenda | `/painel/solicitacoes/[id]` |
| 9. Pós-evento | Fornecedor marca concluído → cliente avalia | Avaliação entra em moderação e só depois aparece | idem |

## 4. Jornada do prestador

1. **Descoberta** — página `/seja-fornecedor` (gratuito na fase de lançamento).
2. **Cadastro** — responsável, contato, empresa, CPF/CNPJ (validado, nunca exibido), categorias, descrição, bairro base e raio, preço inicial e capacidade (opcionais). Status: *aguardando aprovação*.
3. **Aprovação** — admin aprova (aparece no catálogo e na IA) e, após conferir documento e contato, concede o selo *verificado*.
4. **Perfil** — serviços/produtos com tipo de preço, faixa de preço, capacidade, agenda (bloqueio de datas).
5. **Oportunidades** — abas Abertas / Reservas e contratações / Encerradas; ações: marcar em análise, pedir informações, recusar, enviar proposta (valor, inclusos, condições, validade).
6. **Fechamento** — confirmar a reserva aceita pelo cliente (ou liberar com motivo); marcar concluído após a data.
7. **Indicadores** — solicitações e taxa de resposta em 30 dias, conversão proposta→contratação, valor contratado, nota.

## 5. Funcionalidades do MVP (prioridade)

| Prioridade | Funcionalidade | Status |
|---|---|---|
| P0 | Planejador com IA ligado ao catálogo real | ✅ |
| P0 | Catálogo com filtros por região/data/convidados | ✅ |
| P0 | Solicitação → proposta → reserva → contratação | ✅ |
| P0 | Cadastro de fornecedor com aprovação | ✅ |
| P0 | Painel do cliente, do fornecedor e do admin | ✅ |
| P1 | Avaliações só de contratações concluídas + moderação | ✅ |
| P1 | Notificações no app | ✅ (e-mail/WhatsApp: Fase 2) |
| P1 | Reclamações | ✅ |
| P2 | Upload de fotos/portfólio | Fase 2 (modelo pronto; capas ilustradas no MVP) |
| P2 | Login Google, confirmação de e-mail, recuperação de senha | Fase 2 |
| P3 | Pagamentos e comissão | Fase 3–4 (tabela `transactions` reservada) |

Fora do MVP de propósito: chat em tempo real, app nativo, marketplace de produtos com estoque, eventos corporativos grandes (B2B).

## 6. Diferenciais da IA

1. **Fundamentada em dados reais** — a IA só recomenda o que a ferramenta `buscar_fornecedores` retorna; cada card explica *por que* combina.
2. **Números calculados, não gerados** — o modelo escolhe serviços e prioridades; o servidor calcula estimativas e a divisão da verba. Sem alucinação de valores, consistência entre conversas.
3. **Conversa, não formulário** — pergunta só o que falta, aceita respostas curtas ("Tijuca", "12 mil").
4. **Consciente de restrições** — alerta quando o orçamento não cobre os essenciais, sugere substituições (churrasco no lugar de buffet), formatos mais baratos e datas de menor demanda.
5. **Plano versionado** — cada ajuste gera nova versão; base para "o que mudou" e aprendizado.
6. **Ativo de dados** — cada proposta real calibra as estimativas por categoria/bairro (roadmap): com o tempo, a Planfest terá o melhor índice de preços de festas do Rio.
7. **Independente de fornecedor de LLM** — interface `PlannerEngine`; Claude (Sonnet 5.5 por padrão) com modo demonstração por regras para desenvolvimento, testes e contingência.
