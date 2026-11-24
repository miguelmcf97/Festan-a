# Regras de negócio

> Última revisão: 24/11/2026. Fonte da verdade no código: `src/lib/quote-rules.ts` (estados) e `src/server/services/quotes.ts` (operações).

## 1. Vocabulário (nunca confundir)

| Termo | O que é | Compromisso |
|---|---|---|
| **Estimativa** | Faixa de custo calculada pela Planfest para um serviço no planejamento | Nenhum. Sempre rotulada "estimativa de referência" |
| **Solicitação de orçamento** | Pedido do cliente a um fornecedor, para um evento e uma categoria | Nenhum |
| **Proposta** | Valor, itens inclusos, condições e validade enviados pelo fornecedor | Vale até a validade; o fornecedor pode substituí-la |
| **Reserva** | Cliente aceitou a proposta; aguardando o fornecedor confirmar (`booking = PENDING_CONFIRMATION`) | Unilateral |
| **Contratação confirmada** | Fornecedor confirmou a reserva (`booking = CONFIRMED`) | Bilateral; data bloqueada na agenda; contatos liberados |
| **Concluída** | Fornecedor marcou o serviço como prestado após a data do evento | Libera avaliação |

## 2. Papéis

- **Cliente (CONSUMER):** planeja, pede orçamentos, aceita/recusa propostas, cancela, avalia, reclama.
- **Fornecedor (PROVIDER):** um usuário administra um fornecedor no MVP; responde solicitações, envia propostas, confirma/libera reservas, conclui serviços, gerencia perfil/agenda.
- **Administrador (ADMIN):** aprova/rejeita/suspende fornecedores, concede selo de verificado, modera avaliações, gerencia categorias e usuários, trata reclamações.
- Uma conta tem um único papel. Para ser cliente e fornecedor, usam-se e-mails diferentes (revisar na Fase 2).

## 3. Máquina de estados da solicitação

```
NEW ──► IN_REVIEW ──► AWAITING_INFO ◄──┐
 │  \        │  \          │           │
 │   \       │   ▼         ▼           │
 │    └────► QUOTED ◄──────┘ ──────────┘
 │             │ (cliente aceita proposta)
 │             ▼
 │      PROPOSAL_ACCEPTED ──(fornecedor confirma)──► BOOKED ──(após a data)──► COMPLETED
 │             │                                       │
 ▼             ▼                                       ▼
DECLINED   CANCELLED (fornecedor libera / cliente cancela)   CANCELLED
```

| De | Para | Quem | Condição / efeito |
|---|---|---|---|
| NEW, IN_REVIEW | AWAITING_INFO | Fornecedor | Envia pergunta (mensagem tipo INFO_REQUEST); cliente notificado |
| AWAITING_INFO | IN_REVIEW | Cliente | Ao responder a mensagem |
| NEW, IN_REVIEW, AWAITING_INFO, QUOTED | QUOTED | Fornecedor | Envia proposta (valor > 0, validade futura). Proposta aberta anterior vira WITHDRAWN |
| QUOTED | PROPOSAL_ACCEPTED | Cliente | Aceita proposta SENT e não expirada → cria booking PENDING_CONFIRMATION; outras propostas abertas da mesma solicitação → REJECTED |
| PROPOSAL_ACCEPTED | BOOKED | Fornecedor | Confirma → booking CONFIRMED; data marcada BOOKED na agenda |
| PROPOSAL_ACCEPTED | CANCELLED | Fornecedor | "Não posso atender" com motivo → booking CANCELLED |
| BOOKED | COMPLETED | Fornecedor | Só a partir da data do evento → booking COMPLETED; cliente convidado a avaliar |
| Qualquer não final | CANCELLED | Cliente | Com motivo opcional; reservas/contratações abertas canceladas e data liberada |
| NEW…QUOTED | DECLINED | Fornecedor | Motivo opcional; cliente notificado |

Estados finais (COMPLETED, CANCELLED, DECLINED) não aceitam mensagens nem transições. Transições inválidas lançam `BusinessRuleError`.

**Primeira resposta:** qualquer ação do fornecedor (análise, pergunta, proposta, mensagem, recusa) registra `first_response_at` — base da taxa de resposta usada no ranking.

## 4. Busca e recomendação

1. Só fornecedores `APPROVED` aparecem (catálogo e IA).
2. Região: atende se o bairro do evento está nas áreas atendidas, é o bairro base, ou está dentro do raio (Haversine, km). Sem bairro informado, não filtra.
3. Data: exclui fornecedores com a data bloqueada (BLOCKED) ou ocupada (BOOKED).
4. Capacidade: exclui se `max_guests` < convidados; avisa se `min_guests` > convidados.
5. Preço: compara o preço inicial com a verba sugerida da categoria (dentro, até 20% acima, acima); nunca exclui por preço.
6. Ordenação: nota com suavização bayesiana (35), proximidade relativa ao raio (20), verificado (15), taxa de resposta (15), aderência de preço (15).
7. Os motivos e alertas exibidos no card vêm exatamente desses critérios.
8. Planos pagos futuros podem dar destaque **somente identificado como patrocinado** e sem burlar os filtros 2–4.

## 5. Planejamento e estimativas

- A IA escolhe categorias e prioridades; o servidor calcula: `estimativa = R$/convidado × convidados + valor fixo` (parâmetros por categoria, editáveis no admin; sem parâmetros → R$ 500–2.000).
- Reserva para imprevistos: 8% do orçamento.
- Distribuição da verba: proporcional ao ponto médio da estimativa ponderado pela prioridade (1,0 / 0,85 / 0,7), arredondada a R$ 50.
- Alertas: mínimo dos essenciais > orçamento; mínimo total > orçamento; verba de item < 85% do mínimo estimado.
- Cada alteração gera nova versão do plano (`event_plans.version`).
- Substituições no modo demonstração: churrasco ou food truck substituem buffet; sítio substitui espaço; quem já tem local não recebe "espaço" no plano.

## 6. Fornecedores: cadastro, aprovação e verificação

- Cadastro exige CPF ou CNPJ com dígitos verificadores válidos, telefone, **uma única categoria**, bairro base, raio e descrição (≥ 30 caracteres). Entra como `PENDING_REVIEW`.
- **Um fornecedor, uma categoria** (desde 24/11/2026): garantido no banco por índice único em `provider_categories(provider_id)`. Todo serviço cadastrado herda essa categoria. Ao trocar de categoria no perfil, os serviços da categoria anterior são desativados (não apagados). A migração `0001_one_category_per_provider` manteve, para quem tinha várias, a categoria com mais serviços ativos (empate: a primeira do catálogo).
- **Fila do admin** em `/admin/fornecedores`, por etapa e pela data da solicitação de cadastro (padrão: mais antigas primeiro; dá para inverter): **Aprovar** (aguardando aprovação) → **Verificar** (aprovados sem selo) → **Remover selo** (verificados) → suspensos e rejeitados (reativar).
- Aprovar = aparece no catálogo e na IA. Rejeitar/suspender = some imediatamente.
- **Verificado** só após o admin conferir documento e contato. O selo é exibido em cards e perfil; "Não verificado" também é exibido (transparência).
- O documento nunca é exibido publicamente; no admin aparece mascarado.

## 6.1 Agenda do fornecedor

- Painel em `/fornecedor/agenda` (resumo dos próximos 30 dias também no painel do fornecedor). Cada dia tem uma situação, da mais forte para a mais fraca: **Fechada** (contratação confirmada) → **Reserva** (cliente aceitou a proposta; falta o fornecedor confirmar) → **Bloqueada** (pelo fornecedor) → **Pedido** (solicitação em aberto para a data) → **Livre**.
- Um toque num dia livre ou com pedido bloqueia; num dia bloqueado, libera. Dias fechados não podem ser liberados pela agenda (só pelo fluxo de contratação). Bloqueio de período: até 92 dias por vez, a partir de hoje (fuso do Rio).
- A busca e a IA excluem fornecedores com a data bloqueada ou fechada.

## 7. Avaliações (autenticidade)

1. Só o cliente da contratação pode avaliar, e só se o booking estiver COMPLETED.
2. Uma avaliação por contratação (restrição única no banco).
3. Entra como PENDING; publicada apenas após moderação (rejeitar: ofensas, dados pessoais, conteúdo sem relação com o serviço).
4. Nota média e contagem consideram apenas PUBLISHED e são recalculadas na moderação.
5. Fornecedor pode responder (campo previsto; interface na Fase 2).

## 8. Privacidade nas interações

- O fornecedor vê o primeiro nome do cliente e os dados do evento; telefone e e-mail do cliente só após contratação confirmada.
- O cliente vê telefone/WhatsApp/e-mail do fornecedor só após contratação confirmada.
- A IA não pede nem armazena CPF, endereço completo ou dados bancários.

## 9. Dados de demonstração

- Todo registro fictício tem `is_demo = true` e aparece com o selo "Demonstração"; a faixa amarela no topo avisa o ambiente.
- O seed é bloqueado em `APP_ENV=production`. Antes do lançamento, remover dados demo do banco de produção (nunca semeá-lo).
- Nenhuma tela simula pagamento; o GMV exibido é declarado nas propostas e rotulado como "não processado pela Planfest".

## 10. Limites (anti-abuso)

| Ação | Limite |
|---|---|
| Login | 8 tentativas / 15 min por IP+e-mail |
| Cadastro | 5 / hora por IP |
| Mensagens à IA | **3 por cliente no total** (somando conversas; visitante que entra na conta leva o uso junto; mensagem que falha não conta; admin sem limite; ajustável em Administração → Indicadores, 0 desliga). Além disso: 30 / hora por usuário ou visitante; 90 / hora por IP |
| Solicitações de orçamento | 20 / dia por cliente |
