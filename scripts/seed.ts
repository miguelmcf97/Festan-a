/**
 * Seed de DESENVOLVIMENTO/HOMOLOGAÇÃO.
 * - Bairros/municípios da Região Metropolitana do Rio (coordenadas aproximadas do centro do bairro).
 * - Categorias com parâmetros iniciais de estimativa (HIPÓTESES a calibrar com propostas reais).
 * - Fornecedores, clientes, contratações e avaliações FICTÍCIOS, todos com isDemo = true.
 * Recusa rodar com APP_ENV=production.
 */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "../src/server/db/schema";

if (process.env.APP_ENV === "production") {
  console.error("Seed de demonstração bloqueado em produção.");
  process.exit(1);
}
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: s });

const R = (reais: number) => reais * 100;

const LOCATIONS: [string, string, number, number, string][] = [
  ["Barra da Tijuca", "Rio de Janeiro", -23.0004, -43.3659, "Zona Oeste"],
  ["Recreio dos Bandeirantes", "Rio de Janeiro", -23.017, -43.463, "Zona Oeste"],
  ["Jacarepaguá", "Rio de Janeiro", -22.9533, -43.3492, "Zona Oeste"],
  ["Campo Grande", "Rio de Janeiro", -22.9035, -43.561, "Zona Oeste"],
  ["Bangu", "Rio de Janeiro", -22.875, -43.465, "Zona Oeste"],
  ["Tijuca", "Rio de Janeiro", -22.925, -43.233, "Zona Norte"],
  ["Vila Isabel", "Rio de Janeiro", -22.916, -43.244, "Zona Norte"],
  ["Méier", "Rio de Janeiro", -22.902, -43.279, "Zona Norte"],
  ["Madureira", "Rio de Janeiro", -22.873, -43.338, "Zona Norte"],
  ["Penha", "Rio de Janeiro", -22.841, -43.278, "Zona Norte"],
  ["Ilha do Governador", "Rio de Janeiro", -22.803, -43.205, "Zona Norte"],
  ["Centro", "Rio de Janeiro", -22.9068, -43.1729, "Centro"],
  ["Botafogo", "Rio de Janeiro", -22.9519, -43.184, "Zona Sul"],
  ["Copacabana", "Rio de Janeiro", -22.9711, -43.1822, "Zona Sul"],
  ["Leblon", "Rio de Janeiro", -22.984, -43.224, "Zona Sul"],
  ["Icaraí", "Niterói", -22.905, -43.11, "Niterói"],
  ["Centro", "Niterói", -22.895, -43.124, "Niterói"],
  ["Região Oceânica", "Niterói", -22.95, -43.07, "Niterói"],
  ["Centro", "São Gonçalo", -22.827, -43.063, "Leste Fluminense"],
  ["Centro", "Maricá", -22.919, -42.819, "Leste Fluminense"],
  ["Centro", "Duque de Caxias", -22.7856, -43.3117, "Baixada Fluminense"],
  ["Centro", "Nova Iguaçu", -22.7592, -43.451, "Baixada Fluminense"],
  ["Centro", "São João de Meriti", -22.804, -43.372, "Baixada Fluminense"],
  ["Centro", "Belford Roxo", -22.764, -43.399, "Baixada Fluminense"],
];

type Cat = { slug: string; name: string; group: string; icon: string; pgMin?: number; pgMax?: number; fxMin?: number; fxMax?: number; kw: string[] };
const CATEGORIES: Cat[] = [
  { slug: "espaco-de-festas", name: "Espaços e casas de festas", group: "Espaços e infraestrutura", icon: "building-2", pgMin: 10, pgMax: 40, fxMin: 800, fxMax: 3000, kw: ["salão", "espaço", "casa de festas"] },
  { slug: "sitios-e-chacaras", name: "Sítios e chácaras", group: "Espaços e infraestrutura", icon: "trees", fxMin: 1500, fxMax: 6000, kw: ["sítio", "chácara"] },
  { slug: "mesas-e-cadeiras", name: "Aluguel de mesas e cadeiras", group: "Espaços e infraestrutura", icon: "armchair", pgMin: 6, pgMax: 15, kw: ["mesas", "cadeiras"] },
  { slug: "tendas-e-estruturas", name: "Tendas e estruturas", group: "Espaços e infraestrutura", icon: "tent", fxMin: 1200, fxMax: 5000, kw: ["tenda"] },
  { slug: "buffet", name: "Buffet", group: "Alimentação", icon: "utensils", pgMin: 55, pgMax: 160, kw: ["buffet", "salgados", "jantar"] },
  { slug: "churrasco", name: "Churrasqueiros", group: "Alimentação", icon: "beef", pgMin: 35, pgMax: 100, kw: ["churrasco"] },
  { slug: "food-trucks", name: "Food trucks e carrinhos", group: "Alimentação", icon: "truck", fxMin: 1200, fxMax: 4500, kw: ["food truck"] },
  { slug: "doces-e-bolos", name: "Doces e bolos", group: "Alimentação", icon: "cake", pgMin: 10, pgMax: 30, kw: ["bolo", "doces"] },
  { slug: "cascata-de-chocolate", name: "Cascatas de chocolate", group: "Alimentação", icon: "candy", fxMin: 350, fxMax: 1100, kw: ["cascata"] },
  { slug: "pipoca-e-algodao-doce", name: "Pipoca e algodão doce", group: "Alimentação", icon: "popcorn", fxMin: 280, fxMax: 850, kw: ["pipoca"] },
  { slug: "brinquedos-inflaveis", name: "Brinquedos infláveis", group: "Entretenimento", icon: "castle", fxMin: 350, fxMax: 1600, kw: ["inflável", "pula-pula"] },
  { slug: "personagens", name: "Personagens", group: "Entretenimento", icon: "drama", fxMin: 300, fxMax: 1100, kw: ["personagem"] },
  { slug: "recreacao", name: "Recreação infantil", group: "Entretenimento", icon: "party-popper", fxMin: 500, fxMax: 2200, kw: ["recreação"] },
  { slug: "musica-ao-vivo", name: "Música ao vivo", group: "Entretenimento", icon: "mic-vocal", fxMin: 1200, fxMax: 5500, kw: ["banda", "voz e violão"] },
  { slug: "dj", name: "DJs", group: "Entretenimento", icon: "disc-3", fxMin: 700, fxMax: 3200, kw: ["dj"] },
  { slug: "fotografia", name: "Fotografia", group: "Serviços especializados", icon: "camera", fxMin: 1000, fxMax: 4500, kw: ["fotógrafo"] },
  { slug: "filmagem", name: "Filmagem", group: "Serviços especializados", icon: "video", fxMin: 1300, fxMax: 5500, kw: ["vídeo"] },
  { slug: "decoracao", name: "Decoração", group: "Serviços especializados", icon: "flower-2", pgMin: 8, pgMax: 45, fxMin: 400, fxMax: 1500, kw: ["decoração", "balões"] },
  { slug: "cerimonial", name: "Cerimonial e assessoria", group: "Serviços especializados", icon: "clipboard-check", fxMin: 1500, fxMax: 7000, kw: ["cerimonial"] },
  { slug: "iluminacao", name: "Iluminação", group: "Serviços especializados", icon: "lamp", fxMin: 500, fxMax: 2800, kw: ["iluminação"] },
  { slug: "sonorizacao", name: "Sonorização", group: "Serviços especializados", icon: "speaker", fxMin: 450, fxMax: 2200, kw: ["som"] },
];

// [nome, categorias, bairro (índice LOCATIONS), raio km, preço min, preço max, nota de preço, minG, maxG, verificado, tom, pitch]
type P = [string, string[], number, number, number | null, number | null, string | null, number | null, number | null, boolean, string, string];
const PROVIDERS: P[] = [
  ["Casa Ventania Eventos", ["espaco-de-festas"], 0, 15, 4500, 14000, "Diária com 5h de uso", 40, 180, true, "violet", "Casa de festas com área kids e varanda coberta"],
  ["Espaço Quintal das Palmeiras", ["espaco-de-festas"], 2, 15, 3200, 9000, "Pacote sábado 4h", 30, 120, true, "emerald", "Quintal arborizado para festas infantis e familiares"],
  ["Salão Estrela do Norte", ["espaco-de-festas"], 7, 12, 2200, 6500, null, 30, 150, false, "amber", "Salão climatizado com cozinha de apoio"],
  ["Recanto Serra Azul", ["espaco-de-festas", "sitios-e-chacaras"], 3, 30, 2800, 7500, "Diária completa", 20, 200, true, "teal", "Sítio com piscina e churrasqueira"],
  ["Espaço Maré Alta", ["espaco-de-festas"], 15, 20, 5000, 16000, null, 50, 220, true, "sky", "Salão com vista para a baía"],
  ["Ateliê Doce Lume", ["doces-e-bolos"], 5, 25, 450, 2500, "Bolo + 100 docinhos a partir de R$ 450", null, null, true, "rose", "Bolos decorados e doces finos"],
  ["Confeitaria Brigadeiro de Vó", ["doces-e-bolos", "cascata-de-chocolate"], 8, 30, 380, 1800, null, null, null, false, "pink", "Doces tradicionais e cascata de chocolate"],
  ["Doceria Flor de Açúcar", ["doces-e-bolos"], 15, 20, 500, 3000, null, null, null, true, "fuchsia", "Bolos artísticos e mesas de doces"],
  ["Sabor de Festa Buffet", ["buffet"], 0, 30, 6000, 22000, "R$ 65 a R$ 140 por pessoa", 40, 300, true, "orange", "Buffet completo com equipe de garçons"],
  ["Buffet Mesa Farta", ["buffet"], 8, 25, 4000, 15000, "A partir de R$ 52 por pessoa", 30, 200, true, "amber", "Salgados, finger food e jantar"],
  ["Coquetel & Cia", ["buffet"], 13, 20, 5500, 20000, null, 30, 150, false, "slate", "Coquetel volante para eventos sociais e corporativos"],
  ["Gourmet Itinerante", ["buffet", "food-trucks"], 16, 35, 3500, 12000, null, 30, 250, true, "lime", "Buffet e food truck de hambúrguer artesanal"],
  ["Brasa Carioca Churrasqueiros", ["churrasco"], 3, 40, 2800, 9000, "R$ 48 a R$ 85 por pessoa", 30, 250, true, "red", "Churrasco completo com equipe e equipamentos"],
  ["Fogo de Chão em Casa", ["churrasco"], 21, 35, 2200, 7000, null, 20, 150, false, "orange", "Churrasqueiro e auxiliar para festas em casa"],
  ["Pula Pula Alegria", ["brinquedos-inflaveis"], 3, 35, 350, 1400, "Diária 6h, montagem inclusa", null, null, true, "yellow", "Infláveis, cama elástica e piscina de bolinhas"],
  ["Mundo Inflável RJ", ["brinquedos-inflaveis"], 20, 30, 300, 1200, null, null, null, false, "sky", "Tobogã inflável e castelo"],
  ["Turma da Recreação", ["recreacao", "personagens"], 5, 30, 600, 2000, "4h com 2 recreadores", null, 80, true, "green", "Recreadores, oficinas e personagens"],
  ["Animarte Personagens", ["personagens"], 12, 35, 350, 1100, null, null, null, false, "purple", "Personagens vivos e contação de histórias"],
  ["DJ Nando Batida", ["dj", "sonorizacao"], 5, 40, 900, 3000, "5h de som + iluminação básica", null, null, true, "indigo", "DJ para 15 anos, casamentos e formaturas"],
  ["Sonora Eventos", ["dj", "sonorizacao", "iluminacao"], 15, 35, 1200, 4500, null, null, null, true, "violet", "Som, luz e DJ em pacote único"],
  ["Trio Bossa Leve", ["musica-ao-vivo"], 13, 30, 1800, 4800, null, null, null, false, "teal", "Voz, violão e percussão para cerimônias"],
  ["Clique Mágico Fotografia", ["fotografia"], 5, 40, 1200, 4000, "Cobertura de 4h", null, null, true, "cyan", "Fotografia de festas infantis e 15 anos"],
  ["Lente Viva Foto e Filme", ["fotografia", "filmagem"], 0, 45, 2200, 8000, "Foto + vídeo em pacote", null, null, true, "slate", "Fotografia e filmagem para casamentos"],
  ["Estúdio Retrato Leste", ["fotografia"], 18, 30, 900, 2800, null, null, null, false, "blue", "Cobertura fotográfica de eventos"],
  ["Balão & Arte Decor", ["decoracao"], 7, 25, 450, 3500, "Pegue e monte a partir de R$ 250", null, null, true, "pink", "Decoração com balões e painéis temáticos"],
  ["Ateliê Festa Bonita", ["decoracao"], 0, 30, 1500, 9000, null, null, null, true, "rose", "Decoração completa para 15 anos e casamentos"],
  ["Decora Fácil Pegue e Monte", ["decoracao"], 21, 30, 220, 900, null, null, null, false, "amber", "Kits pegue e monte temáticos"],
  ["Cerimonial Laço de Fita", ["cerimonial"], 13, 40, 2500, 8000, null, null, null, true, "fuchsia", "Assessoria e cerimonial de casamentos e 15 anos"],
  ["Mesas & Toalhas Rio", ["mesas-e-cadeiras", "tendas-e-estruturas"], 8, 30, 300, 4000, null, null, null, false, "stone", "Mesas, cadeiras, toalhas e tendas"],
  ["Carrinho da Alegria", ["pipoca-e-algodao-doce"], 9, 25, 280, 750, "3h de serviço", null, null, false, "yellow", "Pipoca, algodão doce e crepe"],
];

const DESCRIPTIONS: Record<string, string> = {
  "espaco-de-festas": "Espaço preparado para festas sociais, com estrutura de banheiros, cozinha de apoio e equipe de limpeza. Atendemos aniversários, chás e confraternizações.",
  "doces-e-bolos": "Produção artesanal de bolos e doces sob encomenda, com entrega e montagem da mesa no local do evento.",
  buffet: "Cardápios personalizados, equipe uniformizada e louças inclusas. Montamos o menu conforme o perfil dos convidados e o orçamento.",
  churrasco: "Churrasqueiros experientes, carnes selecionadas e acompanhamentos. Levamos churrasqueira, utensílios e auxiliares.",
  "brinquedos-inflaveis": "Brinquedos higienizados, montagem e desmontagem inclusas, monitores opcionais.",
  recreacao: "Recreadores treinados, brincadeiras por faixa etária e materiais inclusos.",
  personagens: "Personagens com figurinos próprios, interação com as crianças e fotos.",
  dj: "Set personalizado, equipamento profissional e roteiro combinado com o cliente.",
  "musica-ao-vivo": "Repertório de MPB, bossa nova e pop para cerimônias e recepções.",
  fotografia: "Cobertura fotográfica com edição e entrega em galeria online.",
  decoracao: "Projeto de decoração, montagem e desmontagem. Temas infantis, adultos e casamentos.",
  cerimonial: "Planejamento, roteiro do evento e coordenação no dia.",
  "mesas-e-cadeiras": "Locação de mobiliário com entrega e recolhimento.",
  "pipoca-e-algodao-doce": "Carrinhos com operador, insumos inclusos e decoração temática.",
};

async function main() {
  console.log("→ limpando tabelas (demo)…");
  await client.unsafe(`TRUNCATE ${[
    "audit_logs", "notifications", "transactions", "complaints", "reviews", "bookings", "proposals", "quote_messages",
    "quote_requests", "ai_messages", "ai_conversations", "plan_items", "event_plans", "events", "availability",
    "portfolio_items", "services", "provider_service_areas", "provider_categories", "providers", "categories",
    "locations", "sessions", "users", "platform_settings",
  ].join(", ")} CASCADE`);

  const locs = await db
    .insert(s.locations)
    .values(LOCATIONS.map(([name, city, lat, lng, zone]) => ({ name, city, lat, lng, zone, slug: slug(`${name}-${city}`) })))
    .returning();

  const cats = await db
    .insert(s.categories)
    .values(
      CATEGORIES.map((c, i) => ({
        slug: c.slug, name: c.name, group: c.group, icon: c.icon, sortOrder: i, aiKeywords: c.kw,
        estPerGuestMin: c.pgMin != null ? R(c.pgMin) : null, estPerGuestMax: c.pgMax != null ? R(c.pgMax) : null,
        estFixedMin: c.fxMin != null ? R(c.fxMin) : null, estFixedMax: c.fxMax != null ? R(c.fxMax) : null,
      })),
    )
    .returning();
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  const pw = await bcrypt.hash("planfest123", 12);
  const now = new Date();
  const [admin, cliente, cliente2, fornecedorUser] = await db
    .insert(s.users)
    .values([
      { name: "Admin Planfest", email: "admin@planfest.demo", passwordHash: pw, role: "ADMIN", lgpdConsentAt: now, isDemo: true },
      { name: "Marina Souza (demo)", email: "cliente@planfest.demo", passwordHash: pw, role: "CONSUMER", lgpdConsentAt: now, isDemo: true },
      { name: "Rafael Lima (demo)", email: "cliente2@planfest.demo", passwordHash: pw, role: "CONSUMER", lgpdConsentAt: now, isDemo: true },
      { name: "Paula Ventania (demo)", email: "fornecedor@planfest.demo", passwordHash: pw, role: "PROVIDER", lgpdConsentAt: now, isDemo: true },
    ])
    .returning();

  const created: (typeof s.providers.$inferSelect)[] = [];
  for (const [i, p] of PROVIDERS.entries()) {
    const [name, slugs, li, radius, pmin, pmax, note, ming, maxg, verified, tone, pitch] = p;
    const owner = i === 0 ? fornecedorUser : (await db.insert(s.users).values({ name: `Responsável ${name}`, email: `fornecedor${i}@planfest.demo`, passwordHash: pw, role: "PROVIDER", lgpdConsentAt: now, isDemo: true }).returning())[0];
    const [prov] = await db
      .insert(s.providers)
      .values({
        ownerId: owner.id, slug: slug(name), tradeName: name, docType: i % 3 === 0 ? "CPF" : "CNPJ",
        document: i % 3 === 0 ? "00000000000" : "00000000000000", responsibleName: owner.name, email: `contato${i}@planfest.demo`,
        phone: "(21) 90000-0000", whatsapp: "(21) 90000-0000", locationId: locs[li].id, serviceRadiusKm: radius,
        description: DESCRIPTIONS[slugs[0]] ?? pitch, shortPitch: pitch, coverTone: tone,
        priceMin: pmin != null ? R(pmin) : null, priceMax: pmax != null ? R(pmax) : null, priceNote: note,
        minGuests: ming, maxGuests: maxg, status: "APPROVED", verification: verified ? "VERIFIED" : "UNVERIFIED",
        verifiedAt: verified ? now : null, responseRate: 0.55 + ((i * 37) % 40) / 100, avgResponseHrs: 2 + (i % 7) * 3, isDemo: true,
      })
      .returning();
    created.push(prov);
    await db.insert(s.providerCategories).values(slugs.map((cs) => ({ providerId: prov.id, categoryId: catBySlug.get(cs)!.id })));
    await db.insert(s.services).values(
      slugs.map((cs) => ({
        providerId: prov.id, categoryId: catBySlug.get(cs)!.id, name: `${catBySlug.get(cs)!.name} — pacote padrão`,
        description: note ?? pitch, priceType: (pmin != null ? "FROM" : "ON_REQUEST") as "FROM" | "ON_REQUEST",
        priceMin: pmin != null ? R(pmin) : null, priceMax: pmax != null ? R(pmax) : null, capacityMin: ming, capacityMax: maxg,
      })),
    );
  }

  // Um fornecedor pendente de aprovação e um ainda não verificado — para demonstrar o fluxo do admin
  const pendUser = (await db.insert(s.users).values({ name: "Jorge Festas (demo)", email: "pendente@planfest.demo", passwordHash: pw, role: "PROVIDER", lgpdConsentAt: now, isDemo: true }).returning())[0];
  const [pend] = await db.insert(s.providers).values({
    ownerId: pendUser.id, slug: "jorge-som-e-luz", tradeName: "Jorge Som e Luz", docType: "CPF", document: "00000000000",
    responsibleName: "Jorge (demo)", email: "pendente@planfest.demo", phone: "(21) 90000-0000", locationId: locs[9].id,
    description: "Sonorização e iluminação para festas de pequeno e médio porte.", shortPitch: "Som e luz para festas", status: "PENDING_REVIEW", isDemo: true,
  }).returning();
  await db.insert(s.providerCategories).values([{ providerId: pend.id, categoryId: catBySlug.get("sonorizacao")!.id }, { providerId: pend.id, categoryId: catBySlug.get("iluminacao")!.id }]);

  // Agenda: algumas datas bloqueadas para demonstrar filtro de disponibilidade
  const d = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  await db.insert(s.availability).values([
    { providerId: created[0].id, date: d(30), status: "BLOCKED", note: "Evento particular" },
    { providerId: created[8].id, date: d(30), status: "BOOKED" },
    { providerId: created[14].id, date: d(45), status: "BLOCKED" },
  ]);

  // Histórico de contratações concluídas (demo) → avaliações publicadas
  const comments = [
    "Atendimento atencioso do começo ao fim, tudo chegou no horário.",
    "Entregaram exatamente o que foi combinado na proposta.",
    "Boa comunicação pelo WhatsApp e equipe educada no dia.",
    "Qualidade muito boa, só atrasou um pouco a montagem.",
    "Recomendo, os convidados elogiaram bastante.",
  ];
  for (const [i, prov] of created.entries()) {
    const nReviews = i % 4 === 3 ? 0 : 1 + (i % 3);
    for (let k = 0; k < nReviews; k++) {
      const consumer = k % 2 === 0 ? cliente2 : cliente;
      const [ev] = await db.insert(s.events).values({ ownerId: consumer.id, type: "ANIVERSARIO", title: "Evento anterior (demo)", date: d(-40 - k * 20 - i), locationId: prov.locationId, guests: 60, status: "DONE" }).returning();
      const catId = (await db.query.providerCategories.findFirst({ where: (pc, { eq }) => eq(pc.providerId, prov.id) }))!.categoryId;
      const [qr] = await db.insert(s.quoteRequests).values({ eventId: ev.id, consumerId: consumer.id, providerId: prov.id, categoryId: catId, description: "Solicitação de demonstração", status: "COMPLETED", firstResponseAt: now }).returning();
      const amount = prov.priceMin ?? R(1500);
      const [pr] = await db.insert(s.proposals).values({ quoteRequestId: qr.id, amount, description: "Proposta de demonstração", validUntil: d(-50), status: "ACCEPTED" }).returning();
      const [bk] = await db.insert(s.bookings).values({ proposalId: pr.id, eventId: ev.id, consumerId: consumer.id, providerId: prov.id, amount, status: "COMPLETED", confirmedAt: now, completedAt: now }).returning();
      const rating = [5, 4, 5, 4, 5, 3][(i + k) % 6];
      await db.insert(s.reviews).values({ bookingId: bk.id, providerId: prov.id, authorId: consumer.id, rating, comment: comments[(i + k) % comments.length], status: "PUBLISHED", moderatedById: admin.id, moderatedAt: now });
    }
  }
  // Recalcula notas
  await client.unsafe(`
    UPDATE providers p SET avg_rating = r.avg, review_count = r.n
    FROM (SELECT provider_id, AVG(rating)::float AS avg, COUNT(*)::int AS n FROM reviews WHERE status='PUBLISHED' GROUP BY provider_id) r
    WHERE r.provider_id = p.id`);

  // Jornada em andamento para a cliente demo: evento + solicitações em vários status
  const [ev15] = await db.insert(s.events).values({ ownerId: cliente.id, type: "ANIVERSARIO_INFANTIL", title: "Aniversário de 6 anos do Theo (demo)", date: d(60), locationId: locs[2].id, guests: 80, budgetTotal: R(8000), status: "REQUESTING" }).returning();
  const qrNew = await db.insert(s.quoteRequests).values([
    { eventId: ev15.id, consumerId: cliente.id, providerId: created[0].id, categoryId: catBySlug.get("espaco-de-festas")!.id, description: "Festa infantil para 80 pessoas, sábado à tarde.", budget: R(3500), status: "NEW", viaAi: true },
    { eventId: ev15.id, consumerId: cliente.id, providerId: created[14].id, categoryId: catBySlug.get("brinquedos-inflaveis")!.id, description: "Dois infláveis para crianças de 4 a 8 anos.", budget: R(900), status: "QUOTED", viaAi: true, firstResponseAt: now },
    { eventId: ev15.id, consumerId: cliente.id, providerId: created[5].id, categoryId: catBySlug.get("doces-e-bolos")!.id, description: "Bolo temático safari + 200 docinhos.", budget: R(900), status: "AWAITING_INFO", viaAi: true, firstResponseAt: now },
  ]).returning();
  await db.insert(s.proposals).values({ quoteRequestId: qrNew[1].id, amount: R(850), description: "Castelo inflável + cama elástica, 6h, com monitor.", conditions: "Sinal de 30% para reservar a data; restante no dia.", includes: ["Montagem e desmontagem", "1 monitor", "Higienização"], validUntil: d(10) });
  await db.insert(s.quoteMessages).values({ quoteRequestId: qrNew[2].id, authorId: created[5].ownerId, kind: "INFO_REQUEST", body: "Oi! O bolo seria de quantos andares? E tem alguma restrição alimentar entre as crianças?" });

  await db.insert(s.notifications).values([
    { userId: cliente.id, type: "PROPOSAL_RECEIVED", title: "Nova proposta recebida", body: "Pula Pula Alegria enviou um orçamento.", link: "/painel" },
    { userId: fornecedorUser.id, type: "QUOTE_NEW", title: "Nova solicitação de orçamento", body: "Aniversário infantil para 80 pessoas em Jacarepaguá.", link: "/fornecedor" },
  ]);

  await db.insert(s.platformSettings).values([
    { key: "monetization", value: { phase: "launch", leadPriceCents: 0, commissionRate: 0, proMonthlyCents: 0, note: "Fase 1-2: gratuito para fornecedores (formação de oferta)" } },
    { key: "pilot_region", value: { name: "Região Metropolitana do Rio de Janeiro" } },
  ]);

  console.log(`✓ ${locs.length} localidades, ${cats.length} categorias, ${created.length + 1} fornecedores demo`);
  console.log("  logins demo (senha planfest123): admin@planfest.demo · cliente@planfest.demo · fornecedor@planfest.demo");
  await client.end();
}

function slug(x: string) {
  return x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
