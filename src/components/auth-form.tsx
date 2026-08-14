"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { login, register } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { copy, usePreferences } from "@/lib/preferences";

type Props = {
  mode: "login" | "register";
  nextPath?: string;
};

export function AuthForm({ mode, nextPath }: Props) {
  const { language } = usePreferences();
  const t = copy[language].auth;
  const action = mode === "login" ? login : register;
  const [message, formAction, pending] = useActionState(action, null);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const alternateHref = `${mode === "login" ? "/cadastro" : "/login"}${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
  }`;

  return (
    <>
      {googleEnabled ? (
        <GoogleSignInButton nextPath={nextPath} language={language} />
      ) : (
        <div className="mb-4 rounded-[6px] border border-white/10 bg-white/[0.04] p-3 text-sm leading-5 text-[color:var(--muted)]">
          <span className="font-semibold text-[color:var(--foreground)]">
            {language === "en" ? "Google login is being configured." : "Login com Google em configuracao."}
          </span>{" "}
          {language === "en" ? "Use email and password for now." : "Use email e senha por enquanto."}
        </div>
      )}

      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
        <span className="h-px bg-white/10" />
        Email
        <span className="h-px bg-white/10" />
      </div>

      <form action={formAction} className="grid gap-4">
        {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}

      {mode === "register" ? (
        <label className="grid gap-2 text-sm text-[color:var(--muted)]">
          {t.name}
          <input
            name="name"
            required
            className="min-h-12 rounded-[6px] border border-white/10 bg-black/20 px-4 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)]"
            placeholder={t.namePlaceholder}
            autoComplete="name"
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm text-[color:var(--muted)]">
        {t.email}
        <input
          name="email"
          type="email"
          required
          className="min-h-12 rounded-[6px] border border-white/10 bg-black/20 px-4 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)]"
          placeholder="voce@email.com"
          autoComplete="email"
        />
      </label>

      <label className="grid gap-2 text-sm text-[color:var(--muted)]">
        {t.password}
        <input
          name="password"
          type="password"
          minLength={6}
          required
          className="min-h-12 rounded-[6px] border border-white/10 bg-black/20 px-4 text-[color:var(--foreground)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)]"
          placeholder={t.passwordPlaceholder}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>

      {message ? (
        <p className="rounded-[6px] border border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 p-3 text-sm text-[color:var(--foreground)]">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-5 font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-wait disabled:opacity-70"
      >
        {mode === "login" ? <LogIn size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
        {pending ? t.processing : mode === "login" ? t.signIn : t.createAccount}
      </button>

      <p className="text-center text-sm text-[color:var(--muted)]">
        {mode === "login" ? t.noAccount : t.hasAccount}{" "}
        <Link className="font-semibold text-[color:var(--accent)]" href={alternateHref}>
          {mode === "login" ? t.createAccount : t.signIn}
        </Link>
      </p>
      </form>
    </>
  );
}
