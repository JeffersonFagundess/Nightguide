import { DiscoveryExperience } from "@/components/discovery-experience";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getHomeData } from "@/lib/data";

export default async function Home() {
  const { events, venues } = await getHomeData();

  return (
    <main className="min-h-screen overflow-hidden">
      <Header />
      <DiscoveryExperience events={events} venues={venues} />
      <Footer />
    </main>
  );
}
