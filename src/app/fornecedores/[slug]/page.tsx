import type { Metadata } from "next";
import { and, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Clock, MapPin, MessageCircle, Users } from "lucide-react";
import { DemoBadge, LinkButton, Panel, ProviderCover, Stars, VerifiedBadge } from "@/components/ui";
import { formatDate, formatRange } from "@/lib/format";
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
  const [revs, locs, myEvents] = await Promise.all([
    db.query.reviews.findMany({ where: and(eq(reviews.providerId, p.id), eq(reviews.status, "PUBLISHED")), with: { author: { columns: { name: true } } }, orderBy: desc(reviews.createdAt), limit: 20 }),
    listLocations(),
    user?.role === "CONSUMER"
      ? db.query.events.findMany({ where: and(eq(events.ownerId, user.id), inArray(events.status, ["PLANNING", "REQUESTING", "CONTRACTING"])), orderBy: desc(events.createdAt), columns: { id: true, title: true, date: true } })
      : Promise.resolve([]),
  ]);
  const price = formatRange(p.priceMin, p.priceMax);
  const icon = p.categories[0]?.category.icon ?? "sparkles";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <ProviderCover tone={p.coverTone} icon={icon} className="h-44 rounded-3xl sm:h-56" label={`Capa ilustrativa de ${p.tradeName}`} />
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
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{p.location.name}, {p.location.city} · atende até {p.serviceRadiusKm} km</span>
            {p.maxGuests && <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />{p.minGuests ? `${p.minGuests} a ` : "até "}{p.maxGuests} convidados</span>}
            {p.avgResponseHrs != null && <span className="inline-flex items-center gap-1"><Clock className="size-4" aria-hidden />responde em ~{Math.round(p.avgResponseHrs)}h</span>}
          </div>
          {p.isDemo && <p className="mt-4 rounded-xl bg-maracuja-soft p-3 text-sm text-[#6b4800]">Este é um fornecedor fictício criado para demonstração. Nome, preços e avaliações não são reais.</p>}

          <h2 className="mt-8 text-2xl font-bold">Sobre</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line">{p.description}</p>
          <p className="mt-3 text-sm text-ink-soft">Categorias: {p.categories.map((c) => c.category.name).join(", ")}</p>
          {p.serviceAreas.length > 0 && <p className="mt-1 text-sm text-ink-soft">Também atende: {p.serviceAreas.map((a) => a.location.name).join(", ")}</p>}

          <h2 className="mt-8 text-2xl font-bold">Serviços e preços</h2>
          {p.services.length === 0 ? (
            <p className="mt-2 text-ink-soft">O fornecedor ainda não detalhou serviços. Peça um orçamento.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {p.services.map((s) => (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 p-4">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    {s.description && <p className="text-sm text-ink-soft">{s.description}</p>}
                  </div>
                  <p className="text-sm font-semibold">{s.priceType === "ON_REQUEST" ? "Sob consulta" : `${s.priceType === "PER_PERSON" ? "por pessoa " : ""}${formatRange(s.priceMin, s.priceMax)}`}</p>
                </li>
              ))}
            </ul>
          )}
          {price && <p className="mt-2 text-sm text-ink-soft">Faixa geral informada pelo fornecedor: {price}{p.priceNote && ` · ${p.priceNote}`}. O valor final vem na proposta.</p>}

          <h2 className="mt-8 text-2xl font-bold">Avaliações</h2>
          <p className="text-sm text-ink-soft">Somente de clientes que concluíram uma contratação pela Planfest.</p>
          {revs.length === 0 ? (
            <p className="mt-3 text-ink-soft">Ainda sem avaliações.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {revs.map((r) => (
                <li key={r.id} className="rounded-2xl bg-surface p-4">
                  <p className="flex items-center gap-2 text-sm"><strong>{"★".repeat(r.rating)}<span className="text-ink-soft/40">{"★".repeat(5 - r.rating)}</span></strong><span className="text-ink-soft">{r.author.name.split(" ")[0]} · {formatDate(r.createdAt)}</span></p>
                  <p className="mt-1">{r.comment}</p>
                  {r.providerReply && <p className="mt-2 border-l-2 border-line pl-3 text-sm text-ink-soft"><MessageCircle className="mr-1 inline size-3.5" />{r.providerReply}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside id="orcamento" className="lg:sticky lg:top-20 lg:self-start">
          <Panel>
            <h2 className="text-2xl font-bold">Solicitar orçamento</h2>
            <div className="mt-4">
              {!user ? (
                <div className="space-y-3">
                  <p className="text-ink-soft">Entre ou crie sua conta para enviar uma solicitação a {p.tradeName}.</p>
                  <LinkButton href={`/cadastrar?next=/fornecedores/${p.slug}%23orcamento`} className="w-full">Criar conta</LinkButton>
                  <LinkButton href={`/entrar?next=/fornecedores/${p.slug}%23orcamento`} variant="outline" className="w-full">Já tenho conta</LinkButton>
                </div>
              ) : user.role !== "CONSUMER" ? (
                <p className="text-ink-soft">Use uma conta de cliente para pedir orçamentos.</p>
              ) : (
                <QuoteForm
                  providerId={p.id}
                  categories={p.categories.map((c) => ({ id: c.category.id, name: c.category.name }))}
                  events={myEvents.map((e) => ({ id: e.id, title: `${e.title}${e.date ? ` — ${formatDate(e.date)}` : ""}` }))}
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
