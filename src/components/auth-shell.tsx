"use client";

import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/brand-mark";
import { PreferenceSwitches } from "@/components/preferences-menu";
import { copy, usePreferences } from "@/lib/preferences";

export function AuthShell({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const { language } = usePreferences();
  const t = copy[language].auth;
  const title = mode === "login" ? t.loginTitle : t.registerTitle;
  const text = mode === "login" ? t.loginText : t.registerText;

  return (
    <main className="surface-grid grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-6 shadow-2xl shadow-black/40">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link className="inline-flex items-center gap-3" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-[9px] bg-white/[0.04] p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset]">
              <BrandMark className="h-full w-full" />
            </span>
            <span className="font-semibold text-[color:var(--foreground)]">NightGuide</span>
          </Link>
          <PreferenceSwitches compact />
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-[color:var(--foreground)]">{title}</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-[color:var(--muted)]">{text}</p>
        <AuthForm mode={mode} nextPath={nextPath} />
      </section>
    </main>
  );
}
