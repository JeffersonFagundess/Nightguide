"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearDemoSession, setDemoSession, type DemoRole } from "@/lib/demo-session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function login(_prevState: string | null, formData: FormData) {
  if (!hasSupabaseEnv()) {
    return "Configure as variaveis do Supabase antes de entrar.";
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return "Email ou senha invalidos.";
  }

  await clearDemoSession();
  redirect(next ?? "/conta");
}

export async function register(_prevState: string | null, formData: FormData) {
  if (!hasSupabaseEnv()) {
    return "Configure as variaveis do Supabase antes de criar uma conta.";
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const next = sanitizeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (error) {
    return error.message;
  }

  if (!data.session) {
    return "A conta foi criada, mas o login imediato ainda não foi liberado pelo servidor.";
  }

  await clearDemoSession();
  redirect(next ?? "/conta");
}

export async function signInWithGoogle(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/login?error=supabase-env");
  }

  const next = sanitizeNext(String(formData.get("next") ?? "")) ?? "/conta";
  const headerStore = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}

export async function signOut() {
  await clearDemoSession();

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}

export async function demoLogin(formData: FormData) {
  const role = String(formData.get("role") ?? "guest") as DemoRole;
  const next = sanitizeNext(String(formData.get("next") ?? ""));

  await setDemoSession(role === "owner" ? "owner" : "guest");
  redirect(next ?? "/conta");
}

function sanitizeNext(next: string) {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}
