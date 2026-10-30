import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/current-session";
import { mercadoPagoFetch, normalizeMercadoPagoPayment } from "@/lib/mercadopago-server";
import { selectCheckoutPayment } from "@/lib/mercadopago-checkout";

type Preference = {
  id?: string;
  external_reference?: string;
  metadata?: { event_id?: string; buyer_email?: string };
  items?: Array<{ quantity?: number; unit_price?: number }>;
};
type Payment = Parameters<typeof normalizeMercadoPagoPayment>[0] & {
  external_reference?: string;
  transaction_amount?: number;
};

export async function GET(request: Request, context: { params: Promise<{ preferenceId: string }> }) {
  const session = await getCurrentSession(request);
  if (!session) return NextResponse.json({ error: "Login necessario para consultar pagamento." }, { status: 401 });

  const { preferenceId } = await context.params;
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(preferenceId) || !eventId) {
    return NextResponse.json({ error: "Preferencia ou evento invalido." }, { status: 400 });
  }

  try {
    const preference = await mercadoPagoFetch<Preference>(`/checkout/preferences/${encodeURIComponent(preferenceId)}`);
    if (preference.id !== preferenceId || preference.metadata?.event_id !== eventId ||
        preference.metadata?.buyer_email?.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Esta preferencia nao pertence a esta compra." }, { status: 403 });
    }
    const reference = preference.external_reference;
    if (!reference?.startsWith(`nightguide:${eventId}:`)) {
      return NextResponse.json({ error: "Referencia da compra invalida." }, { status: 422 });
    }
    const expectedAmount = (preference.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return NextResponse.json({ error: "Valor da compra invalido." }, { status: 422 });
    }

    const query = new URLSearchParams({ external_reference: reference, sort: "date_created", criteria: "desc", limit: "10" });
    const search = await mercadoPagoFetch<{ results?: Payment[] }>(`/v1/payments/search?${query.toString()}`);
    const payment = selectCheckoutPayment(search.results ?? [], reference, expectedAmount);
    return NextResponse.json({
      status: payment?.status ?? "not_found",
      payment: payment ? normalizeMercadoPagoPayment(payment) : null,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao consultar Mercado Pago." }, { status: 502 });
  }
}
