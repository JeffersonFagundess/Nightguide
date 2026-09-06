import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getDemoSession, type DemoRole } from "@/lib/demo-session";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentSession = {
  role: DemoRole;
  name: string;
  email: string;
  provider: "supabase" | "demo";
};

export async function getCurrentSession(request?: Request): Promise<CurrentSession | null> {
  if (hasSupabaseEnv()) {
    try {
      const bearerToken = getBearerToken(request);
      if (bearerToken) {
        const { url, key } = getSupabaseEnv();
        const tokenClient = createSupabaseClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        const { data, error } = await tokenClient.auth.getUser(bearerToken);
        if (error || !data.user) return null;

        return {
          role: "guest",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "NightGuide",
          email: data.user.email ?? "",
          provider: "supabase",
        };
      }

      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        return {
          role: "guest",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "NightGuide",
          email: data.user.email ?? "",
          provider: "supabase",
        };
      }
    } catch {
      // Fall through to demo session.
    }
  }

  const demo = await getDemoSession();
  if (!demo) return null;

  return {
    role: demo.role,
    name: demo.name,
    email: demo.email,
    provider: "demo",
  };
}

function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
