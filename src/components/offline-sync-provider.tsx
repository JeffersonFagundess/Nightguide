"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { getPendingActionCount, onQueueChange, syncQueuedActions } from "@/lib/offline-sync";

export function OfflineSyncProvider() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      if (!mounted) return;
      setOnline(navigator.onLine);
      setPending(await getPendingActionCount());
    }

    async function syncNow() {
      setSyncing(true);
      await syncQueuedActions();
      setSyncing(false);
      await refresh();
    }

    const unsubscribe = onQueueChange(refresh);
    const handleOnline = () => void syncNow();
    const handleOffline = () => void refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void syncNow();
    };

    void refresh();
    void syncNow();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (pending === 0 && online) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9998] max-w-[calc(100vw-2rem)] rounded-[8px] border border-white/10 bg-[color:var(--panel)] px-3 py-2 text-sm text-[color:var(--foreground)] shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-2">
        {online ? (
          syncing ? (
            <RefreshCw className="animate-spin text-[color:var(--accent)]" size={16} aria-hidden />
          ) : (
            <Cloud className="text-[color:var(--accent)]" size={16} aria-hidden />
          )
        ) : (
          <CloudOff className="text-[color:var(--accent)]" size={16} aria-hidden />
        )}
        <span>{online ? `${pending} alteracao aguardando envio` : "Modo offline ativo"}</span>
      </div>
    </div>
  );
}
