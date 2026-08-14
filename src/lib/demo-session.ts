import { cookies } from "next/headers";

export type DemoRole = "guest" | "owner";

const demoCookieName = "nightguide_demo_role";

export async function getDemoSession() {
  const cookieStore = await cookies();
  const role = cookieStore.get(demoCookieName)?.value;

  if (role === "owner") {
    return {
      role: "owner" as const,
      email: "dono@vila-gastrobar.demo",
      name: "Vila Gastrobar",
      label: "Dono de estabelecimento",
    };
  }

  if (role === "guest") {
    return {
      role: "guest" as const,
      email: "cliente@nightguide.demo",
      name: "Cliente NightGuide",
      label: "Cliente",
    };
  }

  return null;
}

export async function setDemoSession(role: DemoRole) {
  const cookieStore = await cookies();
  cookieStore.set(demoCookieName, role, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  });
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(demoCookieName);
}
