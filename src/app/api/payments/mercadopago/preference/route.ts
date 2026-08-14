import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/current-session";
import { findCheckoutEvent, getMercadoPagoAccessToken, getTicketTotal, mercadoPagoFetch } from "@/lib/mercadopago-server";

type PreferenceBody = {
  eventId?: string;
  quantity?: number;
};

type MercadoPagoPreferenceResponse = {
  id?: string;
  collector_id?: number;
  client_id?: string | number;
  init_point?: string;
  sandbox_init_point?: string;
};

export async function POST(request: Request) {
  const debugId = crypto.randomUUID();
  try {
    const session = await getCurrentSession();
    if (!session) {
      console.warn("[NightGuide][MercadoPago][preference:unauthorized]", { debugId });
      return NextResponse.json({ error: "Login necessario para comprar ingresso." }, { status: 401 });
    }

    const body = (await request.json()) as PreferenceBody;
    const quantity = clampQuantity(body.quantity);
    if (!body.eventId) {
      return NextResponse.json({ error: "Evento nao informado." }, { status: 400 });
    }

    const event = await findCheckoutEvent(body.eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado." }, { status: 404 });
    }

    const total = getTicketTotal(event, quantity);
    if (total <= 0) {
      return NextResponse.json({ error: "Esse ingresso nao precisa de pagamento." }, { status: 400 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://nightguide-saquarema.vercel.app").replace(/\/$/, "");
    const ticketUrl = `${siteUrl}/ingressos/${event.id}`;
    console.info("[NightGuide][MercadoPago][preference:start]", {
      debugId,
      eventId: event.id,
      eventTitle: event.title,
      quantity,
      total,
      sessionEmail: session.email,
      tokenOwnerHint: getTokenOwnerHint(),
      siteUrl,
    });

    const preference = await mercadoPagoFetch<MercadoPagoPreferenceResponse>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: event.id,
            title: `NightGuide - ${event.title}`,
            description: event.highlight,
            quantity,
            unit_price: Number((total / quantity).toFixed(2)),
            currency_id: "BRL",
          },
        ],
        external_reference: `nightguide:${event.id}:${Date.now()}`,
        back_urls: {
          success: `${ticketUrl}?mp_status=approved`,
          failure: `${ticketUrl}?mp_status=rejected`,
          pending: `${ticketUrl}?mp_status=pending`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        metadata: {
          event_id: event.id,
          event_title: event.title,
          quantity,
          buyer_email: session.email,
        },
      }),
    });

    const checkoutUrl = preference.init_point || preference.sandbox_init_point;
    console.info("[NightGuide][MercadoPago][preference:created]", {
      debugId,
      preferenceId: preference.id,
      collectorId: preference.collector_id,
      clientId: preference.client_id,
      initHost: hostFromUrl(preference.init_point),
      sandboxHost: hostFromUrl(preference.sandbox_init_point),
      selectedCheckoutHost: hostFromUrl(checkoutUrl),
    });

    if (!preference.id || !checkoutUrl) {
      return NextResponse.json({ error: "Mercado Pago nao retornou o link de checkout." }, { status: 502 });
    }

    return NextResponse.json(
      {
        debugId,
        preferenceId: preference.id,
        collectorId: preference.collector_id,
        checkoutHost: hostFromUrl(checkoutUrl),
        checkoutUrl,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[NightGuide][MercadoPago][preference:error]", {
      debugId,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json({ debugId, error: error instanceof Error ? error.message : "Erro ao criar checkout Mercado Pago." }, { status: 500 });
  }
}

function clampQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(6, Math.max(1, Math.trunc(quantity)));
}

function getTokenOwnerHint() {
  const suffix = getMercadoPagoAccessToken().split("-").pop();
  return suffix && /^\d+$/.test(suffix) ? suffix : "unknown";
}

function hostFromUrl(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}
