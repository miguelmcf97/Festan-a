"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/auth-actions";
import { Alert, Button, Field, Input } from "./ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Senha" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
      <p className="text-center text-sm text-ink-soft">
        Ainda não tem conta? <Link href={`/cadastrar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-pitanga">Criar conta</Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Seu nome" htmlFor="name" error={fe.name}><Input id="name" name="name" autoComplete="name" required /></Field>
      <Field label="E-mail" htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Celular (opcional)" htmlFor="phone" hint="Só compartilhamos com fornecedores se você autorizar em uma solicitação."><Input id="phone" name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Senha" htmlFor="password" error={fe.password} hint="Mínimo de 8 caracteres."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <label className="flex gap-2.5 text-sm">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-pitanga" required />
        <span>Li e aceito os <Link href="/termos" className="font-semibold underline" target="_blank">termos de uso</Link> e a <Link href="/privacidade" className="font-semibold underline" target="_blank">política de privacidade</Link>.</span>
      </label>
      {fe.consent && <p className="text-xs font-medium text-pitanga-dark">{fe.consent}</p>}
      <label className="flex gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="marketing" className="mt-1 size-4 accent-pitanga" />
        <span>Quero receber dicas e novidades por e-mail (opcional).</span>
      </label>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Criando conta…" : "Criar conta"}</Button>
      <p className="text-center text-sm text-ink-soft">
        Já tem conta? <Link href={`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-pitanga">Entrar</Link>
      </p>
    </form>
  );
}
