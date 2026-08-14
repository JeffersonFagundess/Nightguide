"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PreferenceSwitches } from "@/components/preferences-menu";
import { copy, usePreferences } from "@/lib/preferences";

export function Footer() {
  const { language } = usePreferences();
  const t = copy[language].nav;

  const productLinks = [
    { label: t.featured, href: "#destaques" },
    { label: t.map, href: "#mapa" },
    { label: language === "pt" ? "Eventos" : "Events", href: "#eventos" },
    { label: language === "pt" ? "Roteiro" : "Route", href: "/conta" },
  ];

  const accountLinks = [
    { label: t.signIn, href: "/login" },
    { label: language === "pt" ? "Criar conta" : "Create account", href: "/cadastro" },
    { label: t.account, href: "/conta" },
  ];

  const legalLinks = [
    { label: language === "pt" ? "Termos de serviço" : "Terms of service", href: "#" },
    { label: language === "pt" ? "Privacidade" : "Privacy", href: "#" },
  ];

  return (
    <footer className="border-t border-white/[0.08] bg-[#080b0d]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="NightGuide home">
            <span className="grid h-10 w-10 place-items-center rounded-[9px] bg-white/[0.04] p-1">
              <BrandMark className="h-full w-full" />
            </span>
            <span className="text-lg font-semibold text-white">NightGuide</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/48">
            {language === "pt"
              ? "Guia de eventos, bares e experiências para sair melhor em Saquarema."
              : "Events, bars and experiences guide for better nights in Saquarema."}
          </p>
          <div className="mt-5">
            <PreferenceSwitches compact />
          </div>
        </div>

        <FooterColumn title={language === "pt" ? "Produto" : "Product"} links={productLinks} />
        <FooterColumn title={language === "pt" ? "Conta" : "Account"} links={accountLinks} />
        <FooterColumn title="Legal" links={legalLinks} />
      </div>

      <div className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 text-xs text-white/34 sm:px-6 lg:px-8">
          <span>© 2026 NightGuide. All rights reserved.</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">{title}</h2>
      <div className="mt-4 grid gap-3">
        {links.map((link) => (
          <Link key={`${link.label}-${link.href}`} href={link.href} className="text-sm text-white/78 transition hover:text-[color:var(--accent)]">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
