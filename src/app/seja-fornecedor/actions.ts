"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/auth-actions";
import { isValidCNPJ, isValidCPF, onlyDigits } from "@/lib/br-docs";
import { reaisToCents, slugify } from "@/lib/format";
import { audit, clientIp, createSession, getCurrentUser, hashPassword } from "@/server/auth";
import { db } from "@/server/db";
import { providerCategories, providers, users } from "@/server/db/schema";
import { notify } from "@/server/services/quotes";
import { getActiveCategories } from "@/server/services/catalog-cache";
import { getT } from "@/server/i18n";
import { LIMITS, rateLimit } from "@/server/security/rate-limit";

const schema = z
  .object({
    responsibleName: z.string().trim().min(2, "Informe o nome do responsável").max(80),
    email: z.string().trim().toLowerCase().email("E-mail inválido"),
    password: z.string().min(8, "Senha com pelo menos 8 caracteres").max(128).optional(),
    phone: z.string().trim().min(10, "Telefone com DDD").max(20),
    whatsapp: z.string().trim().max(20).optional(),
    tradeName: z.string().trim().min(2, "Informe o nome da empresa").max(80),
    docType: z.enum(["CPF", "CNPJ"]),
    document: z.string().trim(),
    locationId: z.string().min(1, "Escolha o bairro base"),
    serviceRadiusKm: z.coerce.number().int().min(1).max(150),
    description: z.string().trim().min(30, "Conte um pouco mais sobre seu trabalho (mín. 30 caracteres)").max(3000),
    priceMin: z.string().optional(),
    maxGuests: z.coerce.number().int().min(0).max(5000).optional(),
    consent: z.literal("on", { message: "É preciso aceitar os termos" }),
  })
  .refine((d) => (d.docType === "CPF" ? isValidCPF(d.document) : isValidCNPJ(d.document)), { path: ["document"], message: "Documento inválido" });

const EN_ERRORS: Record<string, string> = {
  "Informe o nome do responsável": "Enter the contact person's name",
  "E-mail inválido": "Invalid email",
  "Senha com pelo menos 8 caracteres": "Password must have at least 8 characters",
  "Telefone com DDD": "Phone number with area code",
  "Informe o nome da empresa": "Enter the business name",
  "Escolha o bairro base": "Choose your base neighborhood",
  "Conte um pouco mais sobre seu trabalho (mín. 30 caracteres)": "Tell us a bit more about your work (min. 30 characters)",
  "É preciso aceitar os termos": "You need to accept the terms",
  "Documento inválido": "Invalid document number",
};

export async function providerSignupAction(_: FormState, fd: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  const { t } = await getT();
  const raw = Object.fromEntries([...fd.entries()].filter(([k, v]) => v !== "" && k !== "categoryId"));
  const parsed = schema.safeParse(raw);
  // Regra: um fornecedor atua em uma única categoria
  const picked = fd.getAll("categoryId").map(String).filter(Boolean);
  const category = picked.length === 1 ? (await getActiveCategories()).find((c) => c.id === picked[0]) : undefined;
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= t(i.message, EN_ERRORS[i.message] ?? "Check this field");
  if (!category) fieldErrors.categories = t("Escolha a categoria do seu serviço", "Choose your service category");
  if (!current && !raw.password) fieldErrors.password ??= t("Crie uma senha", "Create a password");
  if (Object.keys(fieldErrors).length || !parsed.success || !category) return { fieldErrors };
  const d = parsed.data;

  const rl = rateLimit(`provsignup:${await clientIp()}`, LIMITS.signup.limit, LIMITS.signup.windowMs);
  if (!rl.ok) return { error: t("Muitos cadastros a partir desta conexão. Tente mais tarde.", "Too many sign-ups from this connection. Try again later.") };

  let ownerId: string;
  if (current) {
    if (current.role !== "PROVIDER") return { error: t("Sua conta atual é de cliente. Saia e cadastre a empresa com outro e-mail.", "You are signed in with a customer account. Sign out and register the business with another email.") };
    const has = await db.query.providers.findFirst({ where: eq(providers.ownerId, current.id), columns: { id: true } });
    if (has) redirect("/fornecedor");
    ownerId = current.id;
  } else {
    const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
    if (exists) return { fieldErrors: { email: t("Já existe uma conta com este e-mail. Entre primeiro.", "An account with this email already exists. Sign in first.") } };
    const [u] = await db.insert(users).values({ name: d.responsibleName, email: d.email, phone: d.phone, passwordHash: await hashPassword(d.password!), role: "PROVIDER", lgpdConsentAt: new Date() }).returning();
    ownerId = u.id;
  }

  let slug = slugify(d.tradeName);
  if (await db.query.providers.findFirst({ where: eq(providers.slug, slug), columns: { id: true } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const [prov] = await db
    .insert(providers)
    .values({
      ownerId, slug, tradeName: d.tradeName, docType: d.docType, document: onlyDigits(d.document), responsibleName: d.responsibleName,
      email: d.email, phone: d.phone, whatsapp: d.whatsapp ?? null, locationId: d.locationId, serviceRadiusKm: d.serviceRadiusKm,
      description: d.description, priceMin: reaisToCents(d.priceMin), maxGuests: d.maxGuests || null,
      coverTone: ["violet", "emerald", "amber", "teal", "sky", "rose", "orange", "indigo"][Math.floor(Math.random() * 8)],
      status: "PENDING_REVIEW",
    })
    .returning();
  await db.insert(providerCategories).values({ providerId: prov.id, categoryId: category.id });
  await audit(ownerId, "provider.signup", "provider", prov.id);
  const admins = await db.query.users.findMany({ where: eq(users.role, "ADMIN"), columns: { id: true } });
  for (const a of admins) await notify(a.id, "PROVIDER_PENDING", "Novo fornecedor aguardando aprovação", d.tradeName, "/admin/fornecedores");

  if (!current) await createSession(ownerId);
  redirect("/fornecedor");
}
