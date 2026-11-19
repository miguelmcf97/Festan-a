# Roadmap de desenvolvimento e crescimento

> Última revisão: 19/11/2026 · Os marcos de negócio são definidos por métricas (ver `ESTRATEGIA_DE_GO_TO_MARKET.md`), não por datas.

## Entregue nesta etapa (MVP navegável)

- Next.js 16 + PostgreSQL (Drizzle), 25 tabelas, migrações versionadas.
- Planejador com IA (Claude via API, independente de fornecedor) + modo demonstração; ferramentas sobre o catálogo real; prompts versionados; histórico, custo e tokens por conversa.
- Catálogo com busca por raio/área, agenda, capacidade; perfil do fornecedor; solicitação de orçamento.
- Ciclo completo solicitação → proposta → reserva → contratação → conclusão → avaliação moderada; reclamações.
- Painéis do cliente (inclui comparação de propostas), do fornecedor (oportunidades, perfil, serviços, agenda, indicadores) e admin (indicadores, aprovação/verificação, categorias sem código, moderação, usuários).
- Segurança: sessões httpOnly com hash, bcrypt, rate limiting, CSP e cabeçalhos, auditoria, validação com zod, LGPD (consentimento, minimização, contato liberado só após contratação).
- Docker, Nginx, ambientes separados, backup, deploy com confirmação para produção.
- Testes: 17 unitários + E2E das três jornadas.

## Próximas sprints (2 semanas cada)

| Sprint | Entregas | Por quê |
|---|---|---|
| 1 | Chave da API Claude em homologação; avaliação da IA com 50 conversas-roteiro (ver `PLANO_DE_TESTES.md` §4); ajuste do prompt v1.1 | Validar o diferencial com LLM real |
| 1 | Upload de fotos/portfólio (armazenamento S3 compatível + redimensionamento) | Fotos são o principal fator de conversão de fornecedor |
| 2 | E-mail transacional (Resend/SES) + recuperação de senha + confirmação de e-mail; login Google | Notificação fora do app é crítica para taxa de resposta |
| 2 | WhatsApp (API oficial) para alertas de novos pedidos ao fornecedor | Canal que o fornecedor usa de fato |
| 3 | SEO: páginas categoria × bairro, sitemap, dados estruturados (LocalBusiness) | Canal orgânico de demanda |
| 3 | Analytics de produto (eventos de funil, sem dados pessoais) | Medir conversa→pedido→contratação |
| 4 | Calibração das estimativas com propostas reais (mediana por categoria/zona, com mínimo de amostras) | Transformar dados em fosso competitivo |
| 4 | IA para o fornecedor: rascunho de proposta a partir do pedido | Aumentar taxa e velocidade de resposta |
| 5–6 | Pagamentos (gateway com split, Pix, sinal retido, cancelamento/estorno), KYC do recebedor, notas | Fase 4 de monetização |
| 6 | Plano Pro (cobrança recorrente) | Fase 3 de monetização |
| 7+ | PWA/app, casamentos (checklist por meses, cerimonialista), lista de convidados, multi-praça (cidade como dimensão do catálogo) | Expansão |

## Riscos do negócio e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Oferta insuficiente em algumas zonas/categorias → IA recomenda pouco | Alta | Alto | Fase 1 com metas por zona × categoria; IA informa com honestidade e sugere bairros vizinhos |
| Fornecedores não respondem (baixa liquidez) | Alta | Alto | Alertas por WhatsApp, ranking por velocidade, limite de pedidos sem resposta antes de reduzir exposição |
| Desintermediação após o primeiro contato | Alta | Alto | Contato só após contratação; valor no pagamento pela plataforma (garantia, parcelamento); comissão moderada |
| Estimativas da IA percebidas como "orçamento" | Média | Médio | Rotulagem explícita em todas as telas; termos de uso; calibração com dados reais |
| Alucinação ou resposta inadequada da IA | Média | Alto | Ferramentas como única fonte de fornecedores; números calculados no servidor; avaliação contínua; fallback por regras |
| Custo de IA acima do previsto | Baixa | Médio | Limite por usuário/hora, histórico curto + estado estruturado, cache de prompt, Haiku para etapas simples |
| Avaliações falsas ou ataque à reputação | Média | Alto | Só contratação concluída avalia; moderação; resposta do fornecedor; auditoria |
| LGPD / vazamento de dados | Baixa | Alto | Minimização, documento nunca público, logs de auditoria, backups criptografados, DPO e revisão jurídica antes do lançamento |
| Concorrente nacional lança IA ou entra no Rio | Média | Médio | Densidade local, multi-ocasião, dados de preço próprios |
| Ciclo econômico / fim de incentivos ao setor | Média | Médio | Fase gratuita; formatos econômicos (pegue e monte, festa em casa) no planejamento |
| Dependência de um fornecedor de LLM | Baixa | Médio | Interface `PlannerEngine`; troca de modelo/fornecedor sem mudar regra de negócio |

## Estratégia de crescimento (resumo)

1. **Ganhar o Rio em festas infantis e 15 anos** (densidade > abrangência).
2. **Converter dados em produto**: índice de preços por bairro, previsões de disponibilidade, IA que responde pelo fornecedor.
3. **Monetizar quando houver liquidez**, com pagamento na plataforma como valor para os dois lados.
4. **Replicar o playbook** praça a praça, só depois de provar aquisição orgânica eficiente.
5. **Subir de ticket**: casamentos e eventos corporativos pequenos, com cerimonialistas como parceiros.
