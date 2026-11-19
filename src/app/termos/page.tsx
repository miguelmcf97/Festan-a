import type { Metadata } from "next";
export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3">
      <h1 className="text-3xl font-bold">Termos de uso</h1>
      <p className="rounded-xl bg-maracuja-soft p-3 text-sm">Minuta para o MVP — precisa de revisão jurídica antes do lançamento público.</p>
      <h2>O papel da Planfest</h2>
      <p>A Planfest conecta pessoas que organizam festas a fornecedores independentes. Os serviços são prestados pelos fornecedores, que definem preços e condições nas propostas.</p>
      <h2>Estimativas não são orçamentos</h2>
      <p>Valores gerados pela assistente de planejamento são estimativas de referência. Preço, disponibilidade e condições valem apenas quando constam de uma proposta enviada pelo fornecedor.</p>
      <h2>Solicitação, proposta e contratação</h2>
      <p>Pedir orçamento não gera compromisso. Aceitar uma proposta cria uma reserva, que só vira contratação confirmada quando o fornecedor confirma. Nesta versão, pagamentos são combinados diretamente entre as partes; a Planfest não processa pagamentos.</p>
      <h2>Avaliações</h2>
      <p>Só pode avaliar quem concluiu uma contratação pela plataforma. Avaliações passam por moderação e podem ser removidas se violarem estes termos.</p>
    </article>
  );
}
