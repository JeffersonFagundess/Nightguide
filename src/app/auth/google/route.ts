import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;
  const next = sanitizeNext(requestUrl.searchParams.get("next") ?? "") ?? "/conta";
  const { supabase, applyCookies } = createRouteClient(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=google", siteUrl));
  }

  return applyCookies(NextResponse.redirect(data.url));
}

function sanitizeNext(next: string) {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}
