import type { Metadata } from "next";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Termos de uso", "Terms of use") };
}

export default async function Termos() {
  const { lang } = await getT();
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3">
      {lang === "en" ? (
        <>
          <h1 className="text-3xl font-bold">Terms of use</h1>
          <p className="rounded-xl bg-maracuja-soft p-3 text-sm">Draft for the MVP — needs legal review before the public launch. The Portuguese version prevails.</p>
          <h2>Planfest’s role</h2>
          <p>Planfest connects people who organize parties with independent vendors. Services are provided by the vendors, who set prices and terms in their proposals.</p>
          <h2>Estimates are not quotes</h2>
          <p>Amounts produced by the planning assistant are reference estimates. Price, availability and terms only apply when they appear in a proposal sent by the vendor.</p>
          <h2>Request, proposal and booking</h2>
          <p>Requesting a quote creates no commitment. Accepting a proposal creates a reservation, which only becomes a confirmed booking when the vendor confirms it. In this version, payments are arranged directly between the parties; Planfest does not process payments.</p>
          <h2>AI assistant</h2>
          <p>Each customer can send a limited number of messages to the planning assistant. The limit is shown on the planning screen.</p>
          <h2>Reviews</h2>
          <p>Only people who completed a booking through the platform can leave a review. Reviews are moderated and may be removed if they break these terms.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Termos de uso</h1>
          <p className="rounded-xl bg-maracuja-soft p-3 text-sm">Minuta para o MVP — precisa de revisão jurídica antes do lançamento público.</p>
          <h2>O papel da Planfest</h2>
          <p>A Planfest conecta pessoas que organizam festas a fornecedores independentes. Os serviços são prestados pelos fornecedores, que definem preços e condições nas propostas.</p>
          <h2>Estimativas não são orçamentos</h2>
          <p>Valores gerados pela assistente de planejamento são estimativas de referência. Preço, disponibilidade e condições valem apenas quando constam de uma proposta enviada pelo fornecedor.</p>
          <h2>Solicitação, proposta e contratação</h2>
          <p>Pedir orçamento não gera compromisso. Aceitar uma proposta cria uma reserva, que só vira contratação confirmada quando o fornecedor confirma. Nesta versão, pagamentos são combinados diretamente entre as partes; a Planfest não processa pagamentos.</p>
          <h2>Assistente de IA</h2>
          <p>Cada cliente pode enviar um número limitado de mensagens à assistente de planejamento. O limite aparece na tela de planejamento.</p>
          <h2>Avaliações</h2>
          <p>Só pode avaliar quem concluiu uma contratação pela plataforma. Avaliações passam por moderação e podem ser removidas se violarem estes termos.</p>
        </>
      )}
    </article>
  );
}
