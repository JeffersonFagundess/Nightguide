"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { copy, usePreferences } from "@/lib/preferences";

export function HeaderNav({ user }: { user: string | null }) {
  const { language } = usePreferences();
  const t = copy[language].nav;

  return (
    <>
      <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 text-sm text-[color:var(--muted)] md:flex">
        <a className="rounded-full px-4 py-2 transition hover:bg-white/[0.08] hover:text-[color:var(--foreground)]" href="#destaques">
          {t.featured}
        </a>
        <a className="rounded-full px-4 py-2 transition hover:bg-white/[0.08] hover:text-[color:var(--foreground)]" href="#mapa">
          {t.map}
        </a>
        <Link className="rounded-full px-4 py-2 transition hover:bg-white/[0.08] hover:text-[color:var(--foreground)]" href="/conta">
          {t.account}
        </Link>
      </nav>

      {user ? null : (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <PreferenceSwitches />
          <Link
            className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] bg-[#ff775c] px-3 text-sm font-semibold text-[#15100e] shadow-[0_10px_28px_rgba(255,119,92,0.28)] transition hover:bg-[#ff5f41] sm:px-4"
            href="/login"
            aria-label={t.signIn}
          >
            {t.signIn}
          </Link>
        </div>
      )}
    </>
  );
}

export function PreferenceSwitches({ compact = false }: { compact?: boolean }) {
  const { theme, language, setTheme, setLanguage } = usePreferences();

  return (
    <div className={`flex min-w-0 shrink-0 items-center ${compact ? "gap-2 sm:gap-4" : "gap-2 sm:gap-5"} text-xs font-semibold uppercase tracking-[0.08em]`}>
      <div className="inline-flex items-center gap-1.5 sm:gap-2" aria-label="Tema">
        <button
          onClick={() => setTheme("dark")}
          className={`inline-flex items-center gap-1 transition ${theme === "dark" ? "text-[color:var(--accent)]" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
        >
          <Moon size={13} aria-hidden />
          {compact ? <span className="sr-only">Dark</span> : <span className="hidden sm:inline">Dark</span>}
        </button>
        <span className="text-[color:var(--muted)]/50">/</span>
        <button
          onClick={() => setTheme("light")}
          className={`inline-flex items-center gap-1 transition ${theme === "light" ? "text-[color:var(--accent)]" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
        >
          <Sun size={13} aria-hidden />
          {compact ? <span className="sr-only">Light</span> : <span className="hidden sm:inline">Light</span>}
        </button>
      </div>

      <div className="inline-flex items-center gap-1.5 sm:gap-2" aria-label="Idioma">
        <button
          onClick={() => setLanguage("pt")}
          className={`transition ${language === "pt" ? "text-[color:var(--accent)]" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
        >
          PT
        </button>
        <span className="text-[color:var(--muted)]/50">/</span>
        <button
          onClick={() => setLanguage("en")}
          className={`transition ${language === "en" ? "text-[color:var(--accent)]" : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"}`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
