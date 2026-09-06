import Link from "next/link";
import { UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { HeaderNav, PreferenceSwitches } from "@/components/preferences-menu";
import { getCurrentSession } from "@/lib/current-session";
import { signOut } from "@/app/auth/actions";

export async function Header() {
  const user = await getUserEmail();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[color:var(--header)]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-1.5 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="NightGuide home">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white/[0.04] p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_18px_36px_rgba(255,119,92,0.18)] sm:h-12 sm:w-12">
            <BrandMark className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
          </span>
          <span className="max-[520px]:hidden">
            <span className="block text-lg font-semibold leading-5 text-[color:var(--foreground)]">NightGuide</span>
            <span className="hidden text-xs uppercase tracking-[0.24em] text-[color:var(--muted)] sm:block">
              Saquarema
            </span>
          </span>
        </Link>

        <HeaderNav user={user} />

        {user ? (
          <form action={signOut} className="flex items-center gap-3">
            <span className="hidden max-w-44 truncate text-sm text-[color:var(--muted)] sm:inline">{user}</span>
            <Link
              href="/conta"
              className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-[6px] bg-[#ff775c] px-3 text-sm font-semibold text-[#15100e] shadow-[0_10px_28px_rgba(255,119,92,0.22)] transition hover:bg-[#ff5f41] sm:hidden"
              aria-label="Minha conta"
            >
              <UserRound size={18} aria-hidden />
            </Link>
            <PreferenceSwitches compact />
            <button className="min-h-10 rounded-[6px] border border-white/10 px-4 text-sm font-medium text-[color:var(--foreground)] transition hover:bg-white/10">
              Sair
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}

async function getUserEmail() {
  const session = await getCurrentSession();
  return session?.email ?? null;
}
