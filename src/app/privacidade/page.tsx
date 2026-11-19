import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacidade e LGPD" };

export default function Privacidade() {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3 [&_li]:mt-1 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-3xl font-bold">Política de privacidade</h1>
      <p className="rounded-xl bg-maracuja-soft p-3 text-sm">Minuta para o MVP — precisa de revisão jurídica antes do lançamento público.</p>
      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Conta: nome, e-mail, celular (opcional) e senha (armazenada apenas como hash).</li>
        <li>Planejamento: dados do evento que você informa (tipo, data, bairro, convidados, orçamento, preferências) e as mensagens trocadas com a assistente de IA.</li>
        <li>Fornecedores: dados da empresa, CPF/CNPJ (nunca exibido publicamente), contato e área de atendimento.</li>
        <li>Segurança: IP e navegador nas sessões e registros de auditoria.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Montar o planejamento e recomendar fornecedores compatíveis (base legal: execução de contrato).</li>
        <li>Enviar suas solicitações aos fornecedores que você escolher — somente a eles.</li>
        <li>Prevenir fraudes e garantir a autenticidade das avaliações (legítimo interesse).</li>
        <li>Enviar novidades, apenas se você consentir.</li>
      </ul>
      <h2>Inteligência artificial</h2>
      <p>As mensagens do planejamento podem ser processadas por um provedor de modelo de linguagem contratado pela Planfest, apenas para gerar a resposta. Não pedimos nem enviamos CPF, endereço completo ou dados bancários à IA.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados pelo e-mail do encarregado (DPO) a ser definido. Pedidos de exclusão anonimizam a conta e preservam apenas o necessário para obrigações legais.</p>
    </article>
  );
}
