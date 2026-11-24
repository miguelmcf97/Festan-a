import Link from "next/link";
import { BadgeCheck, MessageCircle, PiggyBank, ShieldCheck } from "lucide-react";
import { HeroPrompt } from "@/components/hero-prompt";
import { ProviderCard } from "@/components/provider-card";
import { CategoryIcon, LinkButton } from "@/components/ui";
import { listActiveCategories, providerCountByCategory, searchProviders } from "@/server/services/search";
import { categoryName, groupName } from "@/lib/i18n";
import { getT } from "@/server/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { lang, t } = await getT();
  const [cats, counts, featured] = await Promise.all([
    listActiveCategories(),
    providerCountByCategory(),
    searchProviders({ verifiedOnly: true, limit: 6, lang }),
  ]);
  const groups = [...new Set(cats.map((c) => c.group))];

  return (
    <>
      <section className="scallop-bottom bg-pitanga pb-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-6 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl">
              {t("Conta como vai ser a festa. A gente monta o plano e acha quem faz.", "Tell us about your party. We build the plan and find who can make it happen.")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/90">
              {t(
                "A IA da Planfest transforma sua ideia em um planejamento com o orçamento dividido por serviço e mostra fornecedores que atendem o seu bairro na Região Metropolitana do Rio.",
                "Planfest's AI turns your idea into a plan with the budget split by service and shows vendors that serve your neighborhood in the Rio de Janeiro metro area.",
              )}
            </p>
            <p className="mt-6 text-sm text-white/85">
              {t("Já sabe o que precisa?", "Already know what you need?")}{" "}
              <Link href="/fornecedores" className="font-semibold text-white underline underline-offset-4">{t("Quero encontrar fornecedores", "Find vendors")}</Link>
            </p>
          </div>
          <HeroPrompt />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="cats-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="cats-title" className="text-3xl font-bold">{t("O que você precisa para a festa", "What you need for the party")}</h2>
          <Link href="/fornecedores" className="text-sm font-semibold text-pitanga hover:underline">{t("Ver todos os fornecedores", "See all vendors")}</Link>
        </div>
        <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => (
            <div key={g}>
              <h3 className="text-base font-bold text-ink-soft">{groupName(g, lang)}</h3>
              <ul className="mt-3 space-y-1">
                {cats.filter((c) => c.group === g).map((c) => (
                  <li key={c.id}>
                    <Link href={`/fornecedores?categoria=${c.slug}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
                      <span className="grid size-9 place-items-center rounded-lg bg-surface group-hover:bg-white"><CategoryIcon name={c.icon} className="size-[18px]" /></span>
                      <span className="flex-1 text-[0.95rem] font-medium">{categoryName(c, lang)}</span>
                      <span className="text-xs text-ink-soft">{counts.get(c.id) ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="how-title">
        <h2 id="how-title" className="text-3xl font-bold">{t("Como funciona", "How it works")}</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { t: t("Descreva a festa do seu jeito", "Describe the party your way"), b: t("Tipo, bairro, convidados, data e quanto quer gastar — tudo numa mensagem. Se faltar algo, a IA assume valores razoáveis e avisa.", "Type, neighborhood, guests, date and how much you want to spend — all in one message. If something is missing, the AI assumes sensible values and tells you.") },
            { t: t("Receba o planejamento", "Get the plan"), b: t("Serviços essenciais e opcionais, estimativa de custo por item, sugestão de divisão do orçamento e dicas para economizar.", "Essential and optional services, a cost estimate per item, a suggested budget split and tips to save.") },
            { t: t("Peça orçamentos e compare", "Request quotes and compare"), b: t("Escolha fornecedores reais que atendem sua região e data. Eles respondem com propostas e você compara antes de fechar.", "Pick real vendors that serve your area and date. They reply with proposals and you compare before booking.") },
          ].map((s, i) => (
            <li key={s.t} className="relative rounded-2xl bg-surface p-6">
              <span className="font-display text-5xl font-extrabold text-pitanga/80">{i + 1}</span>
              <h3 className="mt-3 text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-ink-soft">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured.providers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="feat-title">
          <h2 id="feat-title" className="text-3xl font-bold">{t("Fornecedores verificados", "Verified vendors")}</h2>
          <p className="mt-1 text-ink-soft">{t("Documento e contato conferidos pela equipe Planfest.", "ID and contact details checked by the Planfest team.")}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.providers.map((p) => (
              <ProviderCard key={p.id} p={p} action={<LinkButton href={`/fornecedores/${p.slug}#orcamento`} variant="outline" size="sm" className="w-full">{t("Solicitar orçamento", "Request a quote")}</LinkButton>} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="why-title">
        <h2 id="why-title" className="text-3xl font-bold">{t("Por que planejar pela Planfest", "Why plan with Planfest")}</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { I: MessageCircle, t: t("Você não precisa saber o que contratar", "You don't need to know what to book"), b: t("A IA lista o que festas como a sua costumam precisar e explica as prioridades.", "The AI lists what parties like yours usually need and explains the priorities.") },
            { I: PiggyBank, t: t("Orçamento sob controle", "Budget under control"), b: t("Estimativas por serviço e reserva para imprevistos antes de falar com qualquer fornecedor.", "Estimates per service and a contingency reserve before you talk to any vendor.") },
            { I: BadgeCheck, t: t("Avaliações só de quem contratou", "Reviews only from real customers"), b: t("Só quem concluiu uma contratação pela plataforma pode avaliar.", "Only people who completed a booking through the platform can leave a review.") },
            { I: ShieldCheck, t: t("Seus dados protegidos", "Your data protected"), b: t("Seu contato só é compartilhado com os fornecedores para quem você pedir orçamento.", "Your contact details are only shared with vendors you request quotes from.") },
          ].map(({ I, t: title, b }) => (
            <div key={title}>
              <I className="size-7 text-pitanga" aria-hidden />
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-ink-soft">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="grid gap-6 rounded-3xl bg-ink p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">{t("Você trabalha com festas no Rio?", "Do you work with parties in Rio?")}</h2>
            <p className="mt-3 max-w-xl text-white/80">
              {t(
                "Cadastre sua empresa e receba pedidos de orçamento de clientes que já sabem o que querem, com data, bairro, número de convidados e verba definidos. Na fase de lançamento, o cadastro é gratuito.",
                "Register your business and get quote requests from customers who already know what they want, with date, neighborhood, guest count and budget defined. Sign-up is free during launch.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <LinkButton href="/seja-fornecedor" size="lg">{t("Cadastrar minha empresa", "List my business")}</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
