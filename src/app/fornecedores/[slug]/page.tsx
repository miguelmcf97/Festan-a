import type { Metadata } from "next";
import { and, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Clock, MapPin, MessageCircle, Users } from "lucide-react";
import { DemoBadge, LinkButton, Panel, ProviderCover, Stars, VerifiedBadge } from "@/components/ui";
import { formatDate, formatRange } from "@/lib/format";
import { categoryName } from "@/lib/i18n";
import { getT } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { events, providers, reviews } from "@/server/db/schema";
import { listLocations } from "@/server/services/search";
import { QuoteForm } from "./quote-form";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.query.providers.findFirst({
    where: and(eq(providers.slug, slug), eq(providers.status, "APPROVED")),
    with: {
      location: true,
      categories: { with: { category: true } },
      serviceAreas: { with: { location: true } },
      services: { where: (s, { eq }) => eq(s.active, true), with: { category: true } },
      portfolio: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.tradeName, description: p.shortPitch ?? p.description.slice(0, 150) } : {};
}

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  const { lang, t } = await getT();
  const [revs, locs, myEvents] = await Promise.all([
    db.query.reviews.findMany({ where: and(eq(reviews.providerId, p.id), eq(reviews.status, "PUBLISHED")), with: { author: { columns: { name: true } } }, orderBy: desc(reviews.createdAt), limit: 20 }),
    listLocations(),
    user?.role === "CONSUMER"
      ? db.query.events.findMany({ where: and(eq(events.ownerId, user.id), inArray(events.status, ["PLANNING", "REQUESTING", "CONTRACTING"])), orderBy: desc(events.createdAt), columns: { id: true, title: true, date: true } })
      : Promise.resolve([]),
  ]);
  const price = formatRange(p.priceMin, p.priceMax, lang);
  const icon = p.categories[0]?.category.icon ?? "sparkles";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <ProviderCover tone={p.coverTone} icon={icon} className="h-44 rounded-3xl sm:h-56" label={t(`Capa ilustrativa de ${p.tradeName}`, `Illustrative cover for ${p.tradeName}`)} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <VerifiedBadge verified={p.verification === "VERIFIED"} />
            {p.isDemo && <DemoBadge />}
          </div>
          <h1 className="mt-2 text-4xl font-bold">{p.tradeName}</h1>
          {p.shortPitch && <p className="mt-1 text-lg text-ink-soft">{p.shortPitch}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <Stars value={p.avgRating} count={p.reviewCount} />
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{p.location.name}, {p.location.city} · {t("atende até", "serves up to")} {p.serviceRadiusKm} km</span>
            {p.maxGuests && <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />{p.minGuests ? `${p.minGuests} ${t("a", "to")} ` : `${t("até", "up to")} `}{p.maxGuests} {t("convidados", "guests")}</span>}
            {p.avgResponseHrs != null && <span className="inline-flex items-center gap-1"><Clock className="size-4" aria-hidden />{t("responde em", "replies in")} ~{Math.round(p.avgResponseHrs)}h</span>}
          </div>
          {p.isDemo && <p className="mt-4 rounded-xl bg-maracuja-soft p-3 text-sm text-[#6b4800]">{t("Este é um fornecedor fictício criado para demonstração. Nome, preços e avaliações não são reais.", "This is a fictitious vendor created for the demo. Name, prices and reviews are not real.")}</p>}

          <h2 className="mt-8 text-2xl font-bold">{t("Sobre", "About")}</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line">{p.description}</p>
          <p className="mt-3 text-sm text-ink-soft">{t("Categoria", "Category")}: {p.categories.map((c) => categoryName(c.category, lang)).join(", ")}</p>
          {p.serviceAreas.length > 0 && <p className="mt-1 text-sm text-ink-soft">{t("Também atende", "Also serves")}: {p.serviceAreas.map((a) => a.location.name).join(", ")}</p>}

          <h2 className="mt-8 text-2xl font-bold">{t("Serviços e preços", "Services and prices")}</h2>
          {p.services.length === 0 ? (
            <p className="mt-2 text-ink-soft">{t("O fornecedor ainda não detalhou serviços. Peça um orçamento.", "The vendor has not listed services yet. Request a quote.")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {p.services.map((s) => (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 p-4">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    {s.description && <p className="text-sm text-ink-soft">{s.description}</p>}
                  </div>
                  <p className="text-sm font-semibold">{s.priceType === "ON_REQUEST" ? t("Sob consulta", "On request") : `${s.priceType === "PER_PERSON" ? t("por pessoa ", "per person ") : ""}${formatRange(s.priceMin, s.priceMax, lang)}`}</p>
                </li>
              ))}
            </ul>
          )}
          {price && <p className="mt-2 text-sm text-ink-soft">{t("Faixa geral informada pelo fornecedor", "General range stated by the vendor")}: {price}{p.priceNote && ` · ${p.priceNote}`}. {t("O valor final vem na proposta.", "The final price comes in the proposal.")}</p>}

          <h2 className="mt-8 text-2xl font-bold">{t("Avaliações", "Reviews")}</h2>
          <p className="text-sm text-ink-soft">{t("Somente de clientes que concluíram uma contratação pela Planfest.", "Only from customers who completed a booking through Planfest.")}</p>
          {revs.length === 0 ? (
            <p className="mt-3 text-ink-soft">{t("Ainda sem avaliações.", "No reviews yet.")}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {revs.map((r) => (
                <li key={r.id} className="rounded-2xl bg-surface p-4">
                  <p className="flex items-center gap-2 text-sm"><strong>{"★".repeat(r.rating)}<span className="text-ink-soft/40">{"★".repeat(5 - r.rating)}</span></strong><span className="text-ink-soft">{r.author.name.split(" ")[0]} · {formatDate(r.createdAt, lang)}</span></p>
                  <p className="mt-1">{r.comment}</p>
                  {r.providerReply && <p className="mt-2 border-l-2 border-line pl-3 text-sm text-ink-soft"><MessageCircle className="mr-1 inline size-3.5" />{r.providerReply}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside id="orcamento" className="lg:sticky lg:top-20 lg:self-start">
          <Panel>
            <h2 className="text-2xl font-bold">{t("Solicitar orçamento", "Request a quote")}</h2>
            <div className="mt-4">
              {!user ? (
                <div className="space-y-3">
                  <p className="text-ink-soft">{t(`Entre ou crie sua conta para enviar uma solicitação a ${p.tradeName}.`, `Sign in or create an account to send a request to ${p.tradeName}.`)}</p>
                  <LinkButton href={`/cadastrar?next=/fornecedores/${p.slug}%23orcamento`} className="w-full">{t("Criar conta", "Create account")}</LinkButton>
                  <LinkButton href={`/entrar?next=/fornecedores/${p.slug}%23orcamento`} variant="outline" className="w-full">{t("Já tenho conta", "I already have an account")}</LinkButton>
                </div>
              ) : user.role !== "CONSUMER" ? (
                <p className="text-ink-soft">{t("Use uma conta de cliente para pedir orçamentos.", "Use a customer account to request quotes.")}</p>
              ) : (
                <QuoteForm
                  providerId={p.id}
                  categories={p.categories.map((c) => ({ id: c.category.id, name: categoryName(c.category, lang) }))}
                  events={myEvents.map((e) => ({ id: e.id, title: `${e.title}${e.date ? ` — ${formatDate(e.date, lang)}` : ""}` }))}
                  locations={locs.map((l) => ({ id: l.id, label: l.city === "Rio de Janeiro" ? l.name : `${l.name} (${l.city})`, city: l.city }))}
                />
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
