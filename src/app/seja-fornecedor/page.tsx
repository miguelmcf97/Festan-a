import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarDays, Sparkles, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { myProvider } from "@/server/services/providers";
import { listActiveCategories, listLocations } from "@/server/services/search";
import { ProviderSignupForm } from "./signup-form";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Cadastre sua empresa de festas", "List your party business") };
}

export default async function SejaFornecedor() {
  const user = await getCurrentUser();
  if (user?.role === "PROVIDER" && (await myProvider(user.id))) redirect("/fornecedor");
  const [cats, locs] = await Promise.all([listActiveCategories(), listLocations()]);
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{t("Receba pedidos de quem já sabe o que quer", "Get requests from people who already know what they want")}</h1>
          <p className="mt-4 text-lg text-ink-soft">{t("Na Planfest, o cliente chega com o evento planejado: data, bairro, convidados e quanto quer investir no seu serviço. Você responde com uma proposta pelo painel.", "On Planfest, customers arrive with the event already planned: date, neighborhood, guests and how much they want to spend on your service. You reply with a proposal from your dashboard.")}</p>
          <ul className="mt-8 space-y-5">
            {[
              { I: Sparkles, t: t("Indicado pela IA", "Recommended by the AI"), b: t("A assistente recomenda fornecedores que atendem a região, a data e a faixa de preço do cliente.", "The assistant recommends vendors that match the customer’s area, date and price range.") },
              { I: Wallet, t: t("Gratuito na fase de lançamento", "Free during launch"), b: t("Sem mensalidade e sem comissão enquanto formamos a rede no Rio. Avisaremos com antecedência antes de qualquer cobrança.", "No monthly fee and no commission while we build the network in Rio. We will give advance notice before any charge.") },
              { I: CalendarDays, t: t("Agenda e propostas em um lugar", "Calendar and proposals in one place"), b: t("Veja datas livres e fechadas, bloqueie dias, envie orçamentos e acompanhe cada pedido por status.", "See open and booked dates, block days, send quotes and track each request by status.") },
              { I: BadgeCheck, t: t("Selo de verificado", "Verified badge"), b: t("Conferimos documento e contato. Fornecedores verificados ganham destaque nas recomendações.", "We check ID and contact details. Verified vendors get more visibility in recommendations.") },
            ].map(({ I, t: title, b }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pitanga-soft text-pitanga"><I className="size-5" aria-hidden /></span>
                <div><p className="font-bold">{title}</p><p className="text-ink-soft">{b}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-line p-6 sm:p-8">
          {user && user.role !== "PROVIDER" ? (
            <p className="text-ink-soft">{t("Você está conectado com uma conta de cliente. Para cadastrar uma empresa, saia e use outro e-mail.", "You are signed in with a customer account. To register a business, sign out and use another email.")}</p>
          ) : (
            <ProviderSignupForm
              categories={cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, group: c.group }))}
              locations={locs.map((l) => ({ id: l.id, label: l.city === "Rio de Janeiro" ? `${l.name} (Rio)` : `${l.name} (${l.city})` }))}
              loggedIn={Boolean(user)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
