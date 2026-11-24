import { LinkButton } from "@/components/ui";
import { getT } from "@/server/i18n";

export default async function AcessoNegado() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center">
      <h1 className="text-3xl font-bold">{t("Esta área é de outro tipo de conta", "This area belongs to another account type")}</h1>
      <p className="mt-2 text-ink-soft">{t("Você está conectado com uma conta sem permissão para esta página.", "You are signed in with an account that cannot access this page.")}</p>
      <LinkButton href="/" className="mt-6">{t("Voltar ao início", "Back to home")}</LinkButton>
    </div>
  );
}
