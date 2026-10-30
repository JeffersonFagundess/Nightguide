import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/current-session";
import {
  findCheckoutEvent,
  getTicketTotal,
  mercadoPagoFetch,
  normalizeMercadoPagoPayment,
  type MercadoPagoNormalizedPayment,
} from "@/lib/mercadopago-server";

type MercadoPagoPaymentResponse = Parameters<typeof normalizeMercadoPagoPayment>[0];

type MercadoPagoCheckoutBody = {
  method?: "card" | "pix";
  eventId?: string;
  quantity?: number;
  token?: string;
  paymentMethodId?: string;
  issuerId?: string | number;
  installments?: number;
  payerEmail?: string;
  identificationType?: string;
  identificationNumber?: string;
  testStatus?: string;
};

export async function POST(request: Request) {
  const debugId = crypto.randomUUID();
  try {
    const session = await getCurrentSession(request);
    if (!session) {
      console.warn("[NightGuide][MercadoPago][payment:unauthorized]", { debugId });
      return NextResponse.json({ error: "Login necessario para comprar ingresso." }, { status: 401 });
    }

    const body = (await request.json()) as MercadoPagoCheckoutBody;
    const method = body.method;
    const quantity = clampQuantity(body.quantity);

    if (method !== "card" && method !== "pix") {
      return NextResponse.json({ error: "Metodo de pagamento invalido." }, { status: 400 });
    }

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

    const payerEmail = normalizeEmail(body.payerEmail) || "test@testuser.com";
    const identificationNumber = onlyDigits(body.identificationNumber) || "12345678909";
    const idempotencyKey = crypto.randomUUID();
    const notificationUrl = getNotificationUrl();
    console.info("[NightGuide][MercadoPago][payment:start]", {
      debugId,
      method,
      eventId: event.id,
      eventTitle: event.title,
      quantity,
      total,
      payerEmail,
      testStatus: body.testStatus,
      hasNotificationUrl: Boolean(notificationUrl),
    });

    const commonPayload = {
      transaction_amount: total,
      description: `NightGuide - ${event.title}`,
      external_reference: `nightguide:${event.id}:${Date.now()}`,
      metadata: {
        event_id: event.id,
        event_title: event.title,
        quantity,
        buyer_email: session.email,
      },
      payer: {
        email: payerEmail,
        first_name: session.name.split(" ")[0] || "NightGuide",
        last_name: session.name.split(" ").slice(1).join(" ") || "Teste",
        identification: {
          type: body.identificationType || "CPF",
          number: identificationNumber,
        },
      },
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    };

    const paymentBody =
      method === "pix"
        ? {
            ...commonPayload,
            payment_method_id: "pix",
          }
        : {
            ...commonPayload,
            token: requireField(body.token, "Token do cartao ausente."),
            installments: Number(body.installments || 1),
            payment_method_id: requireField(body.paymentMethodId, "Bandeira do cartao ausente."),
            ...(body.issuerId ? { issuer_id: Number(body.issuerId) } : {}),
          };

    const payment = await mercadoPagoFetch<MercadoPagoPaymentResponse>("/v1/payments", {
        method: "POST",
        headers: {
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(paymentBody),
      });

    const normalized = normalizeMercadoPagoPayment(payment);
      console.info("[NightGuide][MercadoPago][payment:created]", {
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
        event: {
          id: event.id,
          title: event.title,
          venue: event.venue,
        },
        quantity,
        total,
        payment: normalized satisfies MercadoPagoNormalizedPayment,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[NightGuide][MercadoPago][payment:fatal]", {
      debugId,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json({ debugId, error: error instanceof Error ? error.message : "Erro inesperado no Mercado Pago." }, { status: 500 });
  }
}

function clampQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(6, Math.max(1, Math.trunc(quantity)));
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (/\.(demo|test|localhost)$/i.test(email)) return "";
  return email;
}

function onlyDigits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function requireField(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function getNotificationUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl?.startsWith("https://")) return "";
  return `${siteUrl.replace(/\/$/, "")}/api/mercadopago/webhook`;
}
