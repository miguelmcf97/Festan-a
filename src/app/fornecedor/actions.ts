"use server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { reaisToCents } from "@/lib/format";
import { audit, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { availability, providerCategories, providers, services } from "@/server/db/schema";
import { getActiveCategories } from "@/server/services/catalog-cache";
import { addDays, todayRio } from "@/server/services/agenda";
import { getT } from "@/server/i18n";
import { myProvider } from "@/server/services/providers";
import {
  BusinessRuleError,
  completeBooking,
  confirmBooking,
  providerAskInfo,
  providerMessage,
  providerReleaseBooking,
  providerSetStatus,
  sendProposal,
} from "@/server/services/quotes";

async function run(back: string, fn: () => Promise<void>, okMsg: string, okFn?: () => string | undefined) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof BusinessRuleError) redirect(`${back}?erro=${encodeURIComponent(e.message)}`);
    if (e instanceof z.ZodError) redirect(`${back}?erro=${encodeURIComponent(e.issues[0].message)}`);
    throw e;
  }
  revalidatePath(back);
  redirect(`${back}?ok=${encodeURIComponent(okFn?.() ?? okMsg)}`);
}

const qid = (fd: FormData) => z.string().min(1).parse(fd.get("quoteId"));
const back = (id: string) => `/fornecedor/oportunidades/${id}`;

export async function markReviewAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), () => providerSetStatus(id, u.id, "IN_REVIEW"), "Marcada como em análise.");
}

export async function declineAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  const reason = z.string().trim().max(300).parse(fd.get("reason") ?? "");
  await run(back(id), () => providerSetStatus(id, u.id, "DECLINED", reason), "Solicitação recusada. O cliente foi avisado.");
}

export async function askInfoAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), async () => providerAskInfo(id, u.id, z.string().trim().min(5, "Escreva sua pergunta").max(1500).parse(fd.get("body"))), "Pergunta enviada ao cliente.");
}

export async function providerMessageAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), async () => providerMessage(id, u.id, z.string().trim().min(1, "Escreva a mensagem").max(2000).parse(fd.get("body"))), "Mensagem enviada.");
}

export async function sendProposalAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), async () => {
    const amount = reaisToCents(String(fd.get("amount") ?? ""));
    if (!amount) throw new BusinessRuleError("Informe o valor total da proposta");
    const data = z
      .object({
        description: z.string().trim().min(10, "Descreva o que está incluso na proposta").max(3000),
        conditions: z.string().trim().max(1000).optional(),
        includes: z.string().max(1000).optional(),
        validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a validade"),
      })
      .parse(Object.fromEntries(fd));
    await sendProposal(id, u.id, {
      amount,
      description: data.description,
      conditions: data.conditions || null,
      includes: (data.includes ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12),
      validUntil: data.validUntil,
    });
    await audit(u.id, "proposal.send", "quote_request", id, { amount });
  }, "Proposta enviada ao cliente.");
}

export async function confirmBookingAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), async () => { await confirmBooking(id, u.id); await audit(u.id, "booking.confirm", "quote_request", id); }, "Contratação confirmada! A data foi bloqueada na sua agenda.");
}

export async function releaseBookingAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), () => providerReleaseBooking(id, u.id, z.string().trim().min(3, "Informe o motivo").max(300).parse(fd.get("reason"))), "Reserva liberada. O cliente foi avisado.");
}

export async function completeAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const id = qid(fd);
  await run(back(id), () => completeBooking(id, u.id), "Serviço marcado como concluído. O cliente poderá avaliar.");
}

// ───────────── Perfil, serviços e agenda ─────────────

const profileSchema = z.object({
  tradeName: z.string().trim().min(2).max(80),
  shortPitch: z.string().trim().max(120).optional(),
  description: z.string().trim().min(30, "Descrição muito curta (mín. 30 caracteres)").max(3000),
  phone: z.string().trim().min(8).max(20),
  whatsapp: z.string().trim().max(20).optional(),
  email: z.string().trim().email(),
  locationId: z.string().min(1),
  serviceRadiusKm: z.coerce.number().int().min(1).max(150),
  minGuests: z.coerce.number().int().min(0).max(5000).optional(),
  maxGuests: z.coerce.number().int().min(0).max(5000).optional(),
  priceMin: z.string().optional(),
  priceMax: z.string().optional(),
  priceNote: z.string().trim().max(120).optional(),
});

export async function updateProfileAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const prov = await myProvider(u.id);
  if (!prov) redirect("/seja-fornecedor");
  const { t } = await getT();
  let okOverride: string | undefined;
  await run("/fornecedor/perfil", async () => {
    const d = profileSchema.parse(Object.fromEntries([...fd.entries()].filter(([, v]) => v !== "")));
    // Regra: um fornecedor atua em uma única categoria
    const picked = fd.getAll("categoryId").map(String).filter(Boolean);
    const category = picked.length === 1 ? (await getActiveCategories()).find((c) => c.id === picked[0]) : undefined;
    if (!category) throw new BusinessRuleError(t("Escolha a categoria do seu serviço", "Choose your service category"));
    const changed = prov.categories[0]?.categoryId !== category.id;
    await db.transaction(async (tx) => {
      await tx.update(providers).set({
        tradeName: d.tradeName, shortPitch: d.shortPitch ?? null, description: d.description, phone: d.phone, whatsapp: d.whatsapp ?? null,
        email: d.email, locationId: d.locationId, serviceRadiusKm: d.serviceRadiusKm, minGuests: d.minGuests || null, maxGuests: d.maxGuests || null,
        priceMin: reaisToCents(d.priceMin), priceMax: reaisToCents(d.priceMax), priceNote: d.priceNote ?? null,
      }).where(eq(providers.id, prov.id));
      if (changed) {
        await tx.delete(providerCategories).where(eq(providerCategories.providerId, prov.id));
        await tx.insert(providerCategories).values({ providerId: prov.id, categoryId: category.id });
        // serviços cadastrados na categoria anterior saem do ar (não são apagados)
        await tx.update(services).set({ active: false }).where(and(eq(services.providerId, prov.id), ne(services.categoryId, category.id)));
      }
    });
    await audit(u.id, "provider.update", "provider", prov.id, changed ? { category: category.slug } : undefined);
    if (changed) okOverride = t("Perfil atualizado. Serviços da categoria anterior foram desativados.", "Profile updated. Services from the previous category were deactivated.");
  }, t("Perfil atualizado.", "Profile updated."), () => okOverride);
}

export async function addServiceAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const prov = await myProvider(u.id);
  if (!prov) redirect("/seja-fornecedor");
  const { t } = await getT();
  await run("/fornecedor/perfil", async () => {
    const d = z.object({
      name: z.string().trim().min(3, "Dê um nome ao serviço").max(100),
      description: z.string().trim().max(600).optional(),
      priceType: z.enum(["FIXED", "FROM", "PER_PERSON", "ON_REQUEST"]),
      priceMin: z.string().optional(),
      priceMax: z.string().optional(),
      kind: z.enum(["SERVICE", "PRODUCT"]).default("SERVICE"),
    }).parse(Object.fromEntries([...fd.entries()].filter(([, v]) => v !== "")));
    // o serviço herda a categoria única do fornecedor
    const categoryId = prov.categories[0]?.categoryId;
    if (!categoryId) throw new BusinessRuleError(t("Escolha a categoria do seu serviço no perfil antes de cadastrar serviços.", "Choose your service category in the profile before adding services."));
    await db.insert(services).values({ providerId: prov.id, categoryId, name: d.name, description: d.description ?? null, priceType: d.priceType, priceMin: reaisToCents(d.priceMin), priceMax: reaisToCents(d.priceMax), kind: d.kind });
  }, "Serviço adicionado.");
}

export async function removeServiceAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const prov = await myProvider(u.id);
  if (!prov) redirect("/seja-fornecedor");
  await run("/fornecedor/perfil", async () => {
    await db.update(services).set({ active: false }).where(and(eq(services.id, z.string().parse(fd.get("serviceId"))), eq(services.providerId, prov.id)));
  }, "Serviço removido.");
}

// ───────────── Agenda ─────────────

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const agendaBack = (fd: FormData) => {
  const b = String(fd.get("back") ?? "");
  return /^\/fornecedor\/agenda(\?mes=\d{4}-\d{2})?$/.test(b) ? b : "/fornecedor/agenda";
};

/** Um toque no dia: livre → bloqueada; bloqueada → livre. Datas fechadas (contratação) não mudam por aqui. */
export async function toggleDateAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const prov = await myProvider(u.id);
  if (!prov) redirect("/seja-fornecedor");
  const back = agendaBack(fd);
  let ok = "Data bloqueada na agenda.";
  await runAt(back, async () => {
    const date = z.string().regex(dateRe, "Data inválida").parse(fd.get("date"));
    if (date < todayRio()) throw new BusinessRuleError("Data inválida");
    const cur = await db.query.availability.findFirst({ where: and(eq(availability.providerId, prov.id), eq(availability.date, date)) });
    if (cur?.status === "BOOKED") throw new BusinessRuleError("Esta data tem contratação confirmada e não pode ser liberada pela agenda.");
    if (cur?.status === "BLOCKED") {
      await db.delete(availability).where(eq(availability.id, cur.id));
      ok = "Data liberada.";
    } else {
      await db.insert(availability).values({ providerId: prov.id, date, status: "BLOCKED" }).onConflictDoNothing();
    }
  }, () => ok);
}

export async function blockRangeAction(fd: FormData) {
  const u = await requireUser(["PROVIDER"]);
  const prov = await myProvider(u.id);
  if (!prov) redirect("/seja-fornecedor");
  const back = agendaBack(fd);
  let n = 0;
  await runAt(back, async () => {
    const from = z.string().regex(dateRe, "Data inválida").parse(fd.get("from"));
    const to = z.string().regex(dateRe, "Data inválida").parse(fd.get("to"));
    const today = todayRio();
    if (from < today || to < from) throw new BusinessRuleError("Período inválido: a data final precisa ser igual ou depois da inicial, a partir de hoje.");
    const dates: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
    if (dates.length > 92) throw new BusinessRuleError("Bloqueie no máximo 92 dias de uma vez.");
    const note = String(fd.get("note") ?? "").trim().slice(0, 120) || null;
    const res = await db
      .insert(availability)
      .values(dates.map((date) => ({ providerId: prov.id, date, status: "BLOCKED" as const, note })))
      .onConflictDoNothing()
      .returning({ id: availability.id });
    n = res.length;
  }, () => `${n} ${n === 1 ? "data bloqueada" : "datas bloqueadas"}.`);
}

async function runAt(back: string, fn: () => Promise<void>, okFn: () => string) {
  try {
    await fn();
  } catch (e) {
    const sep = back.includes("?") ? "&" : "?";
    if (e instanceof BusinessRuleError) redirect(`${back}${sep}erro=${encodeURIComponent(e.message)}`);
    if (e instanceof z.ZodError) redirect(`${back}${sep}erro=${encodeURIComponent(e.issues[0].message)}`);
    throw e;
  }
  revalidatePath("/fornecedor/agenda");
  revalidatePath("/fornecedor");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent(okFn())}`);
}
