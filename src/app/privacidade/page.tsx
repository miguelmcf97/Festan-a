import type { Metadata } from "next";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Privacidade e LGPD", "Privacy (LGPD)") };
}

export default async function Privacidade() {
  const { lang } = await getT();
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:mt-3 [&_li]:mt-1 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      {lang === "en" ? (
        <>
          <h1 className="text-3xl font-bold">Privacy policy</h1>
          <p className="rounded-xl bg-maracuja-soft p-3 text-sm">Draft for the MVP — needs legal review before the public launch. The Portuguese version prevails.</p>
          <h2>What data we collect</h2>
          <ul>
            <li>Account: name, email, mobile number (optional) and password (stored only as a hash).</li>
            <li>Planning: the event details you provide (type, date, neighborhood, guests, budget, preferences) and the messages exchanged with the AI assistant.</li>
            <li>Vendors: business details, CPF/CNPJ (never shown publicly), contact details and service area.</li>
            <li>Security: IP address and browser in sessions and audit logs.</li>
            <li>Preferences: the site language you choose, stored in a cookie.</li>
          </ul>
          <h2>What we use it for</h2>
          <ul>
            <li>Building the plan and recommending matching vendors (legal basis: performance of a contract).</li>
            <li>Sending your requests to the vendors you choose — and only to them.</li>
            <li>Preventing fraud and keeping reviews authentic (legitimate interest).</li>
            <li>Sending news, only if you consent.</li>
          </ul>
          <h2>Artificial intelligence</h2>
          <p>Planning messages may be processed by a language-model provider hired by Planfest, only to generate the reply. We do not ask for or send your CPF, full address or bank details to the AI.</p>
          <h2>Your rights</h2>
          <p>Under Brazil’s LGPD you can request access, correction, portability or deletion of your data through the data protection officer’s email (to be defined). Deletion requests anonymize the account and keep only what is required by law.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Política de privacidade</h1>
          <p className="rounded-xl bg-maracuja-soft p-3 text-sm">Minuta para o MVP — precisa de revisão jurídica antes do lançamento público.</p>
          <h2>Quais dados coletamos</h2>
          <ul>
            <li>Conta: nome, e-mail, celular (opcional) e senha (armazenada apenas como hash).</li>
            <li>Planejamento: dados do evento que você informa (tipo, data, bairro, convidados, orçamento, preferências) e as mensagens trocadas com a assistente de IA.</li>
            <li>Fornecedores: dados da empresa, CPF/CNPJ (nunca exibido publicamente), contato e área de atendimento.</li>
            <li>Segurança: IP e navegador nas sessões e registros de auditoria.</li>
            <li>Preferências: o idioma do site que você escolher, guardado em um cookie.</li>
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
        </>
      )}
    </article>
  );
}
