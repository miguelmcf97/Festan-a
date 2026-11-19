import { LinkButton } from "@/components/ui";

export default function AcessoNegado() {
  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center">
      <h1 className="text-3xl font-bold">Esta área é de outro tipo de conta</h1>
      <p className="mt-2 text-ink-soft">Você está conectado com uma conta sem permissão para esta página.</p>
      <LinkButton href="/" className="mt-6">Voltar ao início</LinkButton>
    </div>
  );
}
