/**
 * Planfest — modelo de dados (Drizzle ORM / PostgreSQL)
 *
 * Convenções:
 * - Valores monetários em CENTAVOS (integer). Nunca float.
 * - Código em inglês; interface em português.
 * - Registros de demonstração têm isDemo = true e são sinalizados na interface.
 * - Solicitação (quote_requests) ≠ Proposta (proposals) ≠ Contratação (bookings).
 *   Ver docs/REGRAS_DE_NEGOCIO.md.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ───────────────────────────── Enums ─────────────────────────────

export const roleEnum = pgEnum("role", ["CONSUMER", "PROVIDER", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "ANONYMIZED"]);
export const docTypeEnum = pgEnum("doc_type", ["CPF", "CNPJ"]);
export const providerStatusEnum = pgEnum("provider_status", [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);
export const verificationEnum = pgEnum("verification_level", ["UNVERIFIED", "VERIFIED"]);
export const providerPlanEnum = pgEnum("provider_plan", ["FREE", "PRO"]);
export const priceTypeEnum = pgEnum("price_type", ["FIXED", "FROM", "PER_PERSON", "ON_REQUEST"]);
export const availabilityStatusEnum = pgEnum("availability_status", ["BLOCKED", "BOOKED"]);
export const eventTypeEnum = pgEnum("event_type", [
  "ANIVERSARIO",
  "ANIVERSARIO_INFANTIL",
  "QUINZE_ANOS",
  "CASAMENTO",
  "CHA_DE_BEBE",
  "CHA_REVELACAO",
  "FORMATURA",
  "CORPORATIVO",
  "FAMILIAR",
  "TEMATICA",
  "OUTRO",
]);
export const eventStatusEnum = pgEnum("event_status", [
  "PLANNING",
  "REQUESTING",
  "CONTRACTING",
  "DONE",
  "CANCELLED",
]);
export const planSourceEnum = pgEnum("plan_source", ["AI", "USER"]);
export const planPriorityEnum = pgEnum("plan_priority", ["ESSENTIAL", "RECOMMENDED", "OPTIONAL"]);
export const aiRoleEnum = pgEnum("ai_role", ["USER", "ASSISTANT", "TOOL"]);
export const quoteStatusEnum = pgEnum("quote_status", [
  "NEW", // Nova solicitação
  "IN_REVIEW", // Em análise
  "AWAITING_INFO", // Aguardando informações
  "QUOTED", // Orçamento enviado
  "PROPOSAL_ACCEPTED", // Proposta aceita (reserva pendente de confirmação)
  "BOOKED", // Contratação confirmada
  "COMPLETED", // Concluída
  "CANCELLED", // Cancelada
  "DECLINED", // Recusada
]);
export const quoteMessageKindEnum = pgEnum("quote_message_kind", ["MESSAGE", "INFO_REQUEST", "SYSTEM"]);
export const proposalStatusEnum = pgEnum("proposal_status", [
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "WITHDRAWN",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING_CONFIRMATION", // reserva: cliente aceitou, prestador ainda não confirmou
  "CONFIRMED", // contratação confirmada
  "COMPLETED",
  "CANCELLED",
]);
export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "PUBLISHED", "REJECTED"]);
export const complaintStatusEnum = pgEnum("complaint_status", ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "PAYMENT",
  "PAYOUT",
  "PLATFORM_FEE",
  "REFUND",
  "SUBSCRIPTION",
]);
export const transactionStatusEnum = pgEnum("transaction_status", ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]);

// ───────────────────────────── Identidade ─────────────────────────────

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("CONSUMER"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  lgpdConsentAt: timestamp("lgpd_consent_at", { withTimezone: true }).notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(), // SHA-256; o token só existe no cookie httpOnly
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ───────────────────────────── Catálogo ─────────────────────────────

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("sparkles"),
  description: text("description"),
  group: text("group_name").notNull().default("Serviços"),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  // Heurísticas para a IA (editáveis no admin). Sempre apresentadas como ESTIMATIVA.
  aiKeywords: text("ai_keywords").array().notNull().default(sql`'{}'::text[]`),
  estPerGuestMin: integer("est_per_guest_min"),
  estPerGuestMax: integer("est_per_guest_max"),
  estFixedMin: integer("est_fixed_min"),
  estFixedMax: integer("est_fixed_max"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const locations = pgTable("locations", {
  id: id(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("RJ"),
  slug: text("slug").notNull().unique(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  zone: text("zone"),
  active: boolean("active").notNull().default(true),
});

// ───────────────────────────── Prestadores ─────────────────────────────

export const providers = pgTable(
  "providers",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull().unique(),
    tradeName: text("trade_name").notNull(),
    legalName: text("legal_name"),
    docType: docTypeEnum("doc_type").notNull(),
    document: text("document").notNull(), // nunca exibido publicamente
    responsibleName: text("responsible_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    whatsapp: text("whatsapp"),
    addressLine: text("address_line"),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    serviceRadiusKm: integer("service_radius_km").notNull().default(25),
    description: text("description").notNull(),
    shortPitch: text("short_pitch"),
    coverTone: text("cover_tone").notNull().default("violet"),
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
    priceNote: text("price_note"),
    minGuests: integer("min_guests"),
    maxGuests: integer("max_guests"),
    status: providerStatusEnum("status").notNull().default("PENDING_REVIEW"),
    verification: verificationEnum("verification").notNull().default("UNVERIFIED"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    plan: providerPlanEnum("plan").notNull().default("FREE"),
    avgRating: doublePrecision("avg_rating"),
    reviewCount: integer("review_count").notNull().default(0),
    responseRate: doublePrecision("response_rate"),
    avgResponseHrs: doublePrecision("avg_response_hrs"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("providers_status_loc_idx").on(t.status, t.locationId)],
);

export const providerCategories = pgTable(
  "provider_categories",
  {
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.categoryId] })],
);

export const providerServiceAreas = pgTable(
  "provider_service_areas",
  {
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.locationId] })],
);

export const services = pgTable("services", {
  id: id(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind").notNull().default("SERVICE"), // SERVICE | PRODUCT
  priceType: priceTypeEnum("price_type").notNull().default("ON_REQUEST"),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  capacityMin: integer("capacity_min"),
  capacityMax: integer("capacity_max"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: id(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const availability = pgTable(
  "availability",
  {
    id: id(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    status: availabilityStatusEnum("status").notNull(),
    note: text("note"),
  },
  (t) => [uniqueIndex("availability_provider_date_uq").on(t.providerId, t.date)],
);

// ───────────────────────────── Eventos e planejamento ─────────────────────────────

export const events = pgTable(
  "events",
  {
    id: id(),
    ownerId: text("owner_id").references(() => users.id),
    anonymousKey: text("anonymous_key"),
    type: eventTypeEnum("type").notNull().default("OUTRO"),
    title: text("title").notNull(),
    date: date("date", { mode: "string" }),
    dateFlexible: boolean("date_flexible").notNull().default(false),
    locationId: text("location_id").references(() => locations.id),
    locationText: text("location_text"),
    guests: integer("guests"),
    budgetTotal: integer("budget_total"),
    hasVenue: boolean("has_venue"),
    preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
    status: eventStatusEnum("status").notNull().default("PLANNING"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("events_owner_idx").on(t.ownerId), index("events_anon_idx").on(t.anonymousKey)],
);

export const eventPlans = pgTable(
  "event_plans",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    source: planSourceEnum("source").notNull().default("AI"),
    summary: text("summary").notNull(),
    savingsTips: text("savings_tips").array().notNull().default(sql`'{}'::text[]`),
    warnings: text("warnings").array().notNull().default(sql`'{}'::text[]`),
    promptVersion: text("prompt_version"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("event_plans_event_version_uq").on(t.eventId, t.version)],
);

export const planItems = pgTable("plan_items", {
  id: id(),
  planId: text("plan_id")
    .notNull()
    .references(() => eventPlans.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  priority: planPriorityEnum("priority").notNull(),
  estMin: integer("est_min").notNull(), // ESTIMATIVA — não é orçamento
  estMax: integer("est_max").notNull(),
  allocated: integer("allocated").notNull(),
  rationale: text("rationale"),
  included: boolean("included").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ───────────────────────────── IA ─────────────────────────────

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: id(),
    userId: text("user_id").references(() => users.id),
    anonymousKey: text("anonymous_key"),
    eventId: text("event_id").references(() => events.id),
    provider: text("provider").notNull(), // anthropic | demo-rules
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costMicroUsd: integer("cost_micro_usd").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ai_conv_anon_idx").on(t.anonymousKey), index("ai_conv_user_idx").on(t.userId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: aiRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolName: text("tool_name"),
    payload: jsonb("payload"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("ai_msg_conv_idx").on(t.conversationId, t.createdAt)],
);

// ───────────────────────────── Solicitação → Proposta → Contratação ─────────────────────────────

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    consumerId: text("consumer_id")
      .notNull()
      .references(() => users.id),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    serviceId: text("service_id").references(() => services.id),
    description: text("description").notNull(),
    budget: integer("budget"),
    status: quoteStatusEnum("status").notNull().default("NEW"),
    viaAi: boolean("via_ai").notNull().default(false),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    closedReason: text("closed_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("quote_event_provider_category_uq").on(t.eventId, t.providerId, t.categoryId),
    index("quote_provider_status_idx").on(t.providerId, t.status),
    index("quote_consumer_idx").on(t.consumerId),
  ],
);

export const quoteMessages = pgTable("quote_messages", {
  id: id(),
  quoteRequestId: text("quote_request_id")
    .notNull()
    .references(() => quoteRequests.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id),
  kind: quoteMessageKindEnum("kind").notNull().default("MESSAGE"),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const proposals = pgTable("proposals", {
  id: id(),
  quoteRequestId: text("quote_request_id")
    .notNull()
    .references(() => quoteRequests.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  conditions: text("conditions"),
  includes: text("includes").array().notNull().default(sql`'{}'::text[]`),
  validUntil: date("valid_until", { mode: "string" }).notNull(),
  status: proposalStatusEnum("status").notNull().default("SENT"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const bookings = pgTable("bookings", {
  id: id(),
  proposalId: text("proposal_id")
    .notNull()
    .unique()
    .references(() => proposals.id),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  consumerId: text("consumer_id")
    .notNull()
    .references(() => users.id),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  amount: integer("amount").notNull(), // valor acordado — NÃO processado pela plataforma no MVP
  status: bookingStatusEnum("status").notNull().default("PENDING_CONFIRMATION"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ───────────────────────────── Reputação ─────────────────────────────

export const reviews = pgTable("reviews", {
  id: id(),
  bookingId: text("booking_id")
    .notNull()
    .unique() // uma avaliação por contratação concluída
    .references(() => bookings.id),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: reviewStatusEnum("status").notNull().default("PENDING"),
  providerReply: text("provider_reply"),
  moderatedById: text("moderated_by_id").references(() => users.id),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const complaints = pgTable("complaints", {
  id: id(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  providerId: text("provider_id").references(() => providers.id),
  bookingId: text("booking_id").references(() => bookings.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: complaintStatusEnum("status").notNull().default("OPEN"),
  resolution: text("resolution"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ───────────────────────────── Notificações, finanças, governança ─────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.readAt)],
);

/** Reservado para a integração de pagamentos (Fase 4). O MVP NÃO grava nada aqui. */
export const transactions = pgTable("transactions", {
  id: id(),
  bookingId: text("booking_id").references(() => bookings.id),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  status: transactionStatusEnum("status").notNull().default("PENDING"),
  gateway: text("gateway"),
  externalId: text("external_id").unique(),
  meta: jsonb("meta"),
  createdAt: createdAt(),
});

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)],
);

// ───────────────────────────── Relações (API de consulta) ─────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  providers: many(providers),
  events: many(events),
  notifications: many(notifications),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "tree" }),
  children: many(categories, { relationName: "tree" }),
  providerCategories: many(providerCategories),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  owner: one(users, { fields: [providers.ownerId], references: [users.id] }),
  location: one(locations, { fields: [providers.locationId], references: [locations.id] }),
  categories: many(providerCategories),
  serviceAreas: many(providerServiceAreas),
  services: many(services),
  portfolio: many(portfolioItems),
  reviews: many(reviews),
  unavailable: many(availability),
}));

export const providerCategoriesRelations = relations(providerCategories, ({ one }) => ({
  provider: one(providers, { fields: [providerCategories.providerId], references: [providers.id] }),
  category: one(categories, { fields: [providerCategories.categoryId], references: [categories.id] }),
}));

export const providerServiceAreasRelations = relations(providerServiceAreas, ({ one }) => ({
  provider: one(providers, { fields: [providerServiceAreas.providerId], references: [providers.id] }),
  location: one(locations, { fields: [providerServiceAreas.locationId], references: [locations.id] }),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  provider: one(providers, { fields: [services.providerId], references: [providers.id] }),
  category: one(categories, { fields: [services.categoryId], references: [categories.id] }),
}));

export const portfolioRelations = relations(portfolioItems, ({ one }) => ({
  provider: one(providers, { fields: [portfolioItems.providerId], references: [providers.id] }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  provider: one(providers, { fields: [availability.providerId], references: [providers.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  owner: one(users, { fields: [events.ownerId], references: [users.id] }),
  location: one(locations, { fields: [events.locationId], references: [locations.id] }),
  plans: many(eventPlans),
  quoteRequests: many(quoteRequests),
  bookings: many(bookings),
}));

export const eventPlansRelations = relations(eventPlans, ({ one, many }) => ({
  event: one(events, { fields: [eventPlans.eventId], references: [events.id] }),
  items: many(planItems),
}));

export const planItemsRelations = relations(planItems, ({ one }) => ({
  plan: one(eventPlans, { fields: [planItems.planId], references: [eventPlans.id] }),
  category: one(categories, { fields: [planItems.categoryId], references: [categories.id] }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  event: one(events, { fields: [aiConversations.eventId], references: [events.id] }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
}));

export const quoteRequestsRelations = relations(quoteRequests, ({ one, many }) => ({
  event: one(events, { fields: [quoteRequests.eventId], references: [events.id] }),
  consumer: one(users, { fields: [quoteRequests.consumerId], references: [users.id] }),
  provider: one(providers, { fields: [quoteRequests.providerId], references: [providers.id] }),
  category: one(categories, { fields: [quoteRequests.categoryId], references: [categories.id] }),
  service: one(services, { fields: [quoteRequests.serviceId], references: [services.id] }),
  messages: many(quoteMessages),
  proposals: many(proposals),
}));

export const quoteMessagesRelations = relations(quoteMessages, ({ one }) => ({
  quoteRequest: one(quoteRequests, { fields: [quoteMessages.quoteRequestId], references: [quoteRequests.id] }),
  author: one(users, { fields: [quoteMessages.authorId], references: [users.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  quoteRequest: one(quoteRequests, { fields: [proposals.quoteRequestId], references: [quoteRequests.id] }),
  booking: one(bookings, { fields: [proposals.id], references: [bookings.proposalId] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  proposal: one(proposals, { fields: [bookings.proposalId], references: [proposals.id] }),
  event: one(events, { fields: [bookings.eventId], references: [events.id] }),
  consumer: one(users, { fields: [bookings.consumerId], references: [users.id] }),
  provider: one(providers, { fields: [bookings.providerId], references: [providers.id] }),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  provider: one(providers, { fields: [reviews.providerId], references: [providers.id] }),
  author: one(users, { fields: [reviews.authorId], references: [users.id] }),
}));

export const complaintsRelations = relations(complaints, ({ one }) => ({
  reporter: one(users, { fields: [complaints.reporterId], references: [users.id] }),
  provider: one(providers, { fields: [complaints.providerId], references: [providers.id] }),
}));
