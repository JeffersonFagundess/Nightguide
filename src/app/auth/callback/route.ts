import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNext(requestUrl.searchParams.get("next") ?? "") ?? "/conta";

  if (code) {
    const { supabase, applyCookies } = createRouteClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return applyCookies(NextResponse.redirect(new URL(next, siteUrl)));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", siteUrl));
}

function sanitizeNext(next: string) {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}
