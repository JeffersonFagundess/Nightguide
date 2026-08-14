import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/current-session";
import { mercadoPagoFetch, normalizeMercadoPagoPayment } from "@/lib/mercadopago-server";

type MercadoPagoPaymentResponse = Parameters<typeof normalizeMercadoPagoPayment>[0];

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ paymentId: string }>;
  },
) {
  const debugId = crypto.randomUUID();
  try {
    const session = await getCurrentSession();
    if (!session) {
      console.warn("[NightGuide][MercadoPago][payment-status:unauthorized]", { debugId });
      return NextResponse.json({ error: "Login necessario para consultar pagamento." }, { status: 401 });
    }

    const { paymentId } = await context.params;
    if (!/^\d+$/.test(paymentId)) {
      console.warn("[NightGuide][MercadoPago][payment-status:invalid-id]", { debugId, paymentId });
      return NextResponse.json({ error: "Pagamento invalido." }, { status: 400 });
    }

    console.info("[NightGuide][MercadoPago][payment-status:start]", { debugId, paymentId, sessionEmail: session.email });
    const payment = await mercadoPagoFetch<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`);
    const normalized = normalizeMercadoPagoPayment(payment);
    console.info("[NightGuide][MercadoPago][payment-status:result]", {
      debugId,
      paymentId: normalized.id,
      status: normalized.status,
      statusDetail: normalized.statusDetail,
      paymentMethodId: normalized.paymentMethodId,
      paymentTypeId: normalized.paymentTypeId,
    });

    return NextResponse.json(
      {
        debugId,
        payment: normalized,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[NightGuide][MercadoPago][payment-status:fatal]", {
      debugId,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json({ debugId, error: error instanceof Error ? error.message : "Erro ao consultar pagamento." }, { status: 500 });
  }
}
