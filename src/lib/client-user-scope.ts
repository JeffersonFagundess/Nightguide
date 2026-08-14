"use client";

import { createClient } from "@/lib/supabase/browser";

export type ClientUserScope = {
  userId: string | null;
  storageScope: string;
  isAuthenticated: boolean;
};

export async function getClientUserScope(): Promise<ClientUserScope> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        userId: user.id,
        storageScope: `user:${user.id}`,
        isAuthenticated: true,
      };
    }
  } catch {
    // Keep the app usable even if auth is temporarily unreachable.
  }

  return {
    userId: null,
    storageScope: "guest",
    isAuthenticated: false,
  };
}

export function scopedStorageKey(baseKey: string, scope: string) {
  return `${baseKey}:${scope}`;
}
