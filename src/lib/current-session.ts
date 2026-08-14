import { getDemoSession, type DemoRole } from "@/lib/demo-session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentSession = {
  role: DemoRole;
  name: string;
  email: string;
  provider: "supabase" | "demo";
};

export async function getCurrentSession(): Promise<CurrentSession | null> {
  if (hasSupabaseEnv()) {
    try {
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
