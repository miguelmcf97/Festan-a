"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { reaisToCents, slugify } from "@/lib/format";
import { audit, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { categories, complaints, providers, reviews, sessions, users } from "@/server/db/schema";
import { notify, refreshProviderMetrics } from "@/server/services/quotes";

const s = z.string().min(1);
function done(path: string, msg: string): never {
  revalidatePath(path);
  redirect(`${path}?ok=${encodeURIComponent(msg)}`);
}

export async function providerDecisionAction(fd: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = s.parse(fd.get("providerId"));
  const decision = z.enum(["APPROVE", "REJECT", "SUSPEND", "VERIFY", "UNVERIFY", "REACTIVATE"]).parse(fd.get("decision"));
  const prov = await db.query.providers.findFirst({ where: eq(providers.id, id) });
  if (!prov) done("/admin/fornecedores", "Fornecedor não encontrado");
  const patch: Partial<typeof providers.$inferInsert> = {};
  if (decision === "APPROVE" || decision === "REACTIVATE") patch.status = "APPROVED";
  if (decision === "REJECT") patch.status = "REJECTED";
  if (decision === "SUSPEND") patch.status = "SUSPENDED";
  if (decision === "VERIFY") Object.assign(patch, { verification: "VERIFIED", verifiedAt: new Date() });
  if (decision === "UNVERIFY") Object.assign(patch, { verification: "UNVERIFIED", verifiedAt: null });
  await db.update(providers).set(patch).where(eq(providers.id, id));
  await audit(admin.id, `provider.${decision.toLowerCase()}`, "provider", id);
  const msgs: Record<string, [string, string]> = {
    APPROVE: ["Cadastro aprovado", "Seu perfil já aparece no catálogo e nas recomendações da IA."],
    REJECT: ["Cadastro não aprovado", "Revise seus dados e fale com o suporte."],
    SUSPEND: ["Perfil suspenso", "Seu perfil foi suspenso. Fale com o suporte."],
    VERIFY: ["Você recebeu o selo de verificado", "Documento e contato conferidos."],
  };
  if (msgs[decision]) await notify(prov!.ownerId, `PROVIDER_${decision}`, msgs[decision][0], msgs[decision][1], "/fornecedor");
  done("/admin/fornecedores", "Fornecedor atualizado.");
}

export async function reviewModerationAction(fd: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = s.parse(fd.get("reviewId"));
  const status = z.enum(["PUBLISHED", "REJECTED"]).parse(fd.get("status"));
  const [r] = await db.update(reviews).set({ status, moderatedById: admin.id, moderatedAt: new Date() }).where(eq(reviews.id, id)).returning();
  if (r) await refreshProviderMetrics(r.providerId);
  await audit(admin.id, `review.${status.toLowerCase()}`, "review", id);
  done("/admin/avaliacoes", status === "PUBLISHED" ? "Avaliação publicada." : "Avaliação rejeitada.");
}

const catSchema = z.object({
  name: z.string().trim().min(2).max(60),
  group: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(40).default("sparkles"),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  estPerGuestMin: z.string().optional(),
  estPerGuestMax: z.string().optional(),
  estFixedMin: z.string().optional(),
  estFixedMax: z.string().optional(),
  aiKeywords: z.string().optional(),
});

export async function saveCategoryAction(fd: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => v !== ""));
  const parsed = catSchema.safeParse(raw);
  if (!parsed.success) redirect(`/admin/categorias?erro=${encodeURIComponent(parsed.error.issues[0].path.join(".") + ": " + parsed.error.issues[0].message)}`);
  const d = parsed.data;
  const values = {
    name: d.name, group: d.group, icon: d.icon, parentId: d.parentId ?? null, sortOrder: d.sortOrder,
    estPerGuestMin: reaisToCents(d.estPerGuestMin), estPerGuestMax: reaisToCents(d.estPerGuestMax),
    estFixedMin: reaisToCents(d.estFixedMin), estFixedMax: reaisToCents(d.estFixedMax),
    aiKeywords: (d.aiKeywords ?? "").split(",").map((k) => k.trim()).filter(Boolean),
  };
  const id = fd.get("id");
  if (typeof id === "string" && id) {
    await db.update(categories).set(values).where(eq(categories.id, id));
    await audit(admin.id, "category.update", "category", id);
  } else {
    const slug = slugify(d.name);
    if (await db.query.categories.findFirst({ where: eq(categories.slug, slug) })) redirect(`/admin/categorias?erro=${encodeURIComponent("Já existe uma categoria com este nome")}`);
    const [c] = await db.insert(categories).values({ ...values, slug }).returning();
    await audit(admin.id, "category.create", "category", c.id);
  }
  done("/admin/categorias", "Categoria salva.");
}

export async function toggleCategoryAction(fd: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = s.parse(fd.get("id"));
  const c = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (c) await db.update(categories).set({ active: !c.active }).where(eq(categories.id, id));
  await audit(admin.id, "category.toggle", "category", id);
  done("/admin/categorias", c?.active ? "Categoria desativada." : "Categoria ativada.");
}

export async function userStatusAction(fd: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = s.parse(fd.get("userId"));
  if (id === admin.id) done("/admin/usuarios", "Você não pode alterar a própria conta.");
  const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(fd.get("status"));
  await db.update(users).set({ status }).where(eq(users.id, id));
  if (status === "SUSPENDED") await db.delete(sessions).where(eq(sessions.userId, id));
  await audit(admin.id, `user.${status.toLowerCase()}`, "user", id);
  done("/admin/usuarios", "Usuário atualizado.");
}

export async function complaintAction(fd: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const id = s.parse(fd.get("complaintId"));
  const status = z.enum(["IN_REVIEW", "RESOLVED", "DISMISSED"]).parse(fd.get("status"));
  const resolution = z.string().trim().max(1000).parse(fd.get("resolution") ?? "");
  const [c] = await db.update(complaints).set({ status, resolution: resolution || null }).where(eq(complaints.id, id)).returning();
  if (c && status !== "IN_REVIEW") await notify(c.reporterId, "COMPLAINT_UPDATE", "Sua reclamação foi analisada", resolution || "Status atualizado.", "/painel");
  await audit(admin.id, `complaint.${status.toLowerCase()}`, "complaint", id);
  done("/admin/usuarios", "Reclamação atualizada.");
}
