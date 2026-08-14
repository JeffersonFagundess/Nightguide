import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/account-dashboard";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getCurrentSession } from "@/lib/current-session";
import { fallbackEvents, fallbackVenues } from "@/lib/mock-data";

export default async function AccountPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen">
      <Header />
      <AccountDashboard role={session.role} name={session.name} email={session.email} events={fallbackEvents} venues={fallbackVenues} />
      <Footer />
    </main>
  );
}
