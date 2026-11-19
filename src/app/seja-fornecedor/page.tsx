import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarDays, Sparkles, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { myProvider } from "@/server/services/providers";
import { listActiveCategories, listLocations } from "@/server/services/search";
import { ProviderSignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Cadastre sua empresa de festas" };

export default async function SejaFornecedor() {
  const user = await getCurrentUser();
  if (user?.role === "PROVIDER" && (await myProvider(user.id))) redirect("/fornecedor");
  const [cats, locs] = await Promise.all([listActiveCategories(), listLocations()]);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Receba pedidos de quem já sabe o que quer</h1>
          <p className="mt-4 text-lg text-ink-soft">Na Planfest, o cliente chega com o evento planejado: data, bairro, convidados e quanto quer investir no seu serviço. Você responde com uma proposta pelo painel.</p>
          <ul className="mt-8 space-y-5">
            {[
              { I: Sparkles, t: "Indicado pela IA", b: "A assistente recomenda fornecedores que atendem a região, a data e a faixa de preço do cliente." },
              { I: Wallet, t: "Gratuito na fase de lançamento", b: "Sem mensalidade e sem comissão enquanto formamos a rede no Rio. Avisaremos com antecedência antes de qualquer cobrança." },
              { I: CalendarDays, t: "Agenda e propostas em um lugar", b: "Bloqueie datas, envie orçamentos e acompanhe cada pedido por status." },
              { I: BadgeCheck, t: "Selo de verificado", b: "Conferimos documento e contato. Fornecedores verificados ganham destaque nas recomendações." },
            ].map(({ I, t, b }) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pitanga-soft text-pitanga"><I className="size-5" aria-hidden /></span>
                <div><p className="font-bold">{t}</p><p className="text-ink-soft">{b}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-line p-6 sm:p-8">
          {user && user.role !== "PROVIDER" ? (
            <p className="text-ink-soft">Você está conectado com uma conta de cliente. Para cadastrar uma empresa, saia e use outro e-mail.</p>
          ) : (
            <ProviderSignupForm
              categories={cats.map((c) => ({ id: c.id, name: c.name, group: c.group }))}
              locations={locs.map((l) => ({ id: l.id, label: l.city === "Rio de Janeiro" ? `${l.name} (Rio)` : `${l.name} (${l.city})` }))}
              loggedIn={Boolean(user)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
