"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce?: string;
        ux_mode?: "popup" | "redirect";
        use_fedcm_for_prompt?: boolean;
        auto_select?: boolean;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          theme: "outline" | "filled_blue" | "filled_black";
          size: "large" | "medium" | "small";
          shape: "rectangular" | "pill" | "circle" | "square";
          text: "signin_with" | "signup_with" | "continue_with" | "signin";
          type?: "standard" | "icon";
          width?: number;
          locale?: string;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

export function GoogleSignInButton({ nextPath, language }: { nextPath?: string; language: "pt" | "en" }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;
    const googleClientId = clientId;

    async function renderGoogleButton() {
      if (!buttonRef.current || !window.google || cancelled) return;

      const { nonce, hashedNonce } = await createNonce();
      rawNonceRef.current = nonce;

      if (!buttonRef.current || cancelled) return;
      buttonRef.current.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential,
        nonce: hashedNonce,
        ux_mode: "popup",
        use_fedcm_for_prompt: true,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        type: "standard",
        width: buttonRef.current.clientWidth || 360,
        locale: language === "en" ? "en" : "pt-BR",
      });
    }

    async function handleCredential(response: GoogleCredentialResponse) {
      if (!response.credential) {
        setError(language === "en" ? "Google did not return a credential." : "O Google nao retornou uma credencial.");
        return;
      }

      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: rawNonceRef.current,
      });

      if (signInError) {
        setLoading(false);
        setError(
          language === "en"
            ? `Google login failed: ${signInError.message}`
            : `Falha no login com Google: ${signInError.message}`,
        );
        return;
      }

      window.location.assign(sanitizeNext(nextPath) ?? "/conta");
    }

    if (window.google) {
      void renderGoogleButton();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => void renderGoogleButton();
      script.onerror = () => {
        setError(language === "en" ? "Could not load Google login." : "Nao foi possivel carregar o login do Google.");
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [clientId, language, nextPath]);

  if (!clientId) return null;

  return (
    <div className="mb-4">
      <div className="relative min-h-12 w-full overflow-hidden rounded-[7px] bg-white">
        <div ref={buttonRef} className={loading ? "pointer-events-none opacity-45" : ""} />
        {loading ? (
          <div className="absolute inset-0 grid place-items-center bg-white/90 text-sm font-semibold text-[#17120f]">
            {language === "en" ? "Signing in..." : "Entrando..."}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 rounded-[6px] border border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 p-3 text-sm text-[color:var(--foreground)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const encodedNonce = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return { nonce, hashedNonce };
}

function sanitizeNext(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return null;
  return nextPath;
}
