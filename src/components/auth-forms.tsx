"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/auth-actions";
import { Alert, Button, Field, Input } from "./ui";
import { useLang } from "./i18n-client";
import { msg } from "@/lib/messages-en";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const { lang, t } = useLang();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("E-mail", "Email")} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label={t("Senha", "Password")} htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {state?.error && <Alert tone="error">{msg(state.error, lang)}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? t("Entrando…", "Signing in…") : t("Entrar", "Sign in")}</Button>
      <p className="text-center text-sm text-ink-soft">
        {t("Ainda não tem conta?", "No account yet?")} <Link href={`/cadastrar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-pitanga">{t("Criar conta", "Create account")}</Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const { lang, t } = useLang();
  const fe = Object.fromEntries(Object.entries(state?.fieldErrors ?? {}).map(([k, v]) => [k, msg(v, lang)]));
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("Seu nome", "Your name")} htmlFor="name" error={fe.name}><Input id="name" name="name" autoComplete="name" required /></Field>
      <Field label={t("E-mail", "Email")} htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label={t("Celular (opcional)", "Mobile (optional)")} htmlFor="phone" hint={t("Só compartilhamos com fornecedores se você autorizar em uma solicitação.", "We only share it with vendors if you allow it in a request.")}><Input id="phone" name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label={t("Senha", "Password")} htmlFor="password" error={fe.password} hint={t("Mínimo de 8 caracteres.", "At least 8 characters.")}><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <label className="flex gap-2.5 text-sm">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-pitanga" required />
        <span>{t("Li e aceito os", "I have read and accept the")} <Link href="/termos" className="font-semibold underline" target="_blank">{t("termos de uso", "terms of use")}</Link> {t("e a", "and the")} <Link href="/privacidade" className="font-semibold underline" target="_blank">{t("política de privacidade", "privacy policy")}</Link>.</span>
      </label>
      {fe.consent && <p className="text-xs font-medium text-pitanga-dark">{fe.consent}</p>}
      <label className="flex gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="marketing" className="mt-1 size-4 accent-pitanga" />
        <span>{t("Quero receber dicas e novidades por e-mail (opcional).", "Send me tips and news by email (optional).")}</span>
      </label>
      {state?.error && <Alert tone="error">{msg(state.error, lang)}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? t("Criando conta…", "Creating account…") : t("Criar conta", "Create account")}</Button>
      <p className="text-center text-sm text-ink-soft">
        {t("Já tem conta?", "Already have an account?")} <Link href={`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-pitanga">{t("Entrar", "Sign in")}</Link>
      </p>
    </form>
  );
}
