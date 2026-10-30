import Link from "next/link";

export default async function PaymentReturn({ params }: {
  params: Promise<{ outcome: string; eventId: string }>;
}) {
  const { eventId } = await params;
  const appUrl = /^[a-zA-Z0-9-]+$/.test(eventId) ? `nightguide://checkout/${eventId}` : "nightguide://";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 text-center">
      <h1 className="text-3xl font-semibold">Volte ao NightGuide</h1>
      <p>O checkout terminou. Abra o aplicativo e toque em <strong>Verificar pagamento</strong>. O ingresso depende da confirmação direta pelo Mercado Pago.</p>
      <a className="primary-button" href={appUrl}>Abrir o aplicativo</a>
      <Link href="/">Ir para o NightGuide na web</Link>
    </main>
  );
}
