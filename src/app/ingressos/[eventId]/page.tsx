import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { FakeCheckout } from "@/components/fake-checkout";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getCurrentSession } from "@/lib/current-session";
import { getHomeData } from "@/lib/data";
import { fallbackEvents } from "@/lib/mock-data";

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = (await searchParams) ?? {};
  const { events } = await getHomeData();
  const event = events.find((item) => item.id === eventId) ?? fallbackEvents.find((item) => item.id === eventId) ?? fallbackEvents[0];
  const session = await getCurrentSession();
  const status = getQueryValue(query.mp_status) || getQueryValue(query.status) || getQueryValue(query.collection_status);
  const paymentId = getQueryValue(query.payment_id) || getQueryValue(query.collection_id) || getQueryValue(query.preference_id);

  if (!session) {
    redirect(`/login?next=/ingressos/${eventId}`);
  }

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">Ingresso</p>
          <h1 className="mt-3 text-4xl font-semibold text-[color:var(--foreground)]">{event.title}</h1>
          <p className="mt-3 text-[color:var(--muted)]">{event.highlight}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Info label="Local" value={event.venue} />
            <Info label="Data" value={`${event.date} as ${event.time}`} />
            <Info label="Entrada" value={event.price} />
          </div>

          <div className="mt-6 rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Como testar</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Use os cartoes oficiais de teste do Mercado Pago. O nome APRO aprova, OTHE recusa e CONT deixa pendente. No
              Pix, o QR e o copia e cola sao gerados pela API de teste.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <FakeCheckout event={event} buyerEmail={session.email} initialPayment={status ? { id: paymentId, status } : undefined} />
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[6px] border border-white/10 px-4 font-semibold text-[color:var(--foreground)]"
          >
            Voltar aos eventos
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
      <CalendarDays className="mb-3 text-[color:var(--accent)]" size={18} aria-hidden />
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}
