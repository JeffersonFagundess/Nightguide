import { AuthShell } from "@/components/auth-shell";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <AuthShell mode="register" nextPath={next} />;
}
