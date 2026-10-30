import Link from "next/link";

export default async function PaymentReturn({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const eventId = Array.isArray(query.eventId) ? query.eventId[0] : query.eventId;
  const appUrl = eventId && /^[a-zA-Z0-9-]+$/.test(eventId) ? `nightguide://checkout/${eventId}` : "nightguide://";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 text-center">
      <h1 className="text-3xl font-semibold">Volte ao NightGuide</h1>
      <p>O checkout foi encerrado. Abra o aplicativo e toque em <strong>Verificar pagamento</strong>. O ingresso será liberado apenas depois da confirmação pelo Mercado Pago.</p>
      <a className="primary-button" href={appUrl}>Abrir o aplicativo</a>
      <Link href="/">Ir para o NightGuide na web</Link>
    </main>
  );
}
