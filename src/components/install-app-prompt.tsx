"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint] = useState(() => {
    if (typeof window === "undefined") return false;

    return isMobileDevice() && !isInstallUnavailable() && isIosSafari();
  });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;

    return !isMobileDevice() || isInstallUnavailable();
  });

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!dismissed) {
        setInstallEvent(event as BeforeInstallPromptEvent);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [dismissed]);

  if (dismissed || (!installEvent && !showIosHint)) {
    return null;
  }

  const close = () => {
    window.localStorage.setItem("nightguide-install-dismissed", "true");
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;

    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
    close();
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-[8px] border border-white/10 bg-[color:var(--panel)]/94 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[color:var(--accent)] text-[color:var(--ink)]">
          {showIosHint ? <Share size={19} aria-hidden /> : <Download size={19} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[color:var(--foreground)]">Instale o NightGuide</p>
          <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
            {showIosHint
              ? "No iPhone, toque em compartilhar e escolha Adicionar à Tela de Início."
              : "Use como app, com acesso rápido direto pela tela inicial."}
          </p>
          <div className="mt-3 flex gap-2">
            {installEvent ? (
              <button
                onClick={install}
                className="min-h-10 rounded-[6px] bg-[color:var(--accent)] px-4 text-sm font-semibold text-[color:var(--ink)]"
              >
                Instalar
              </button>
            ) : null}
            <button
              onClick={close}
              className="min-h-10 rounded-[6px] border border-white/10 px-4 text-sm font-semibold text-[color:var(--foreground)]"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);

  return isIos && isSafari;
}

function isInstallUnavailable() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && window.navigator.standalone === true);

  return isStandalone || window.localStorage.getItem("nightguide-install-dismissed") === "true";
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}
