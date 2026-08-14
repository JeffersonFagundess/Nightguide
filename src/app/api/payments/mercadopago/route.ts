import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/current-session";
import {
  findCheckoutEvent,
  getTicketTotal,
  mercadoPagoFetch,
  normalizeMercadoPagoPayment,
  isRecoverableMercadoPagoTestError,
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
    const session = await getCurrentSession();
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

    let normalized: MercadoPagoNormalizedPayment;

    try {
      const payment = await mercadoPagoFetch<MercadoPagoPaymentResponse>("/v1/payments", {
        method: "POST",
        headers: {
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(paymentBody),
      });

      normalized = normalizeMercadoPagoPayment(payment);
      console.info("[NightGuide][MercadoPago][payment:created]", {
        debugId,
        paymentId: normalized.id,
        status: normalized.status,
        statusDetail: normalized.statusDetail,
        paymentMethodId: normalized.paymentMethodId,
        paymentTypeId: normalized.paymentTypeId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      console.warn("[NightGuide][MercadoPago][payment:error]", { debugId, message });
      if (!isRecoverableMercadoPagoTestError(message)) throw error;
      normalized = createFallbackTestPayment({ method, total, testStatus: body.testStatus });
      console.info("[NightGuide][MercadoPago][payment:fallback]", {
        debugId,
        paymentId: normalized.id,
        status: normalized.status,
        statusDetail: normalized.statusDetail,
      });
    }

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

function createFallbackTestPayment({
  method,
  total,
  testStatus,
}: {
  method: "card" | "pix";
  total: number;
  testStatus?: string;
}): MercadoPagoNormalizedPayment {
  const normalizedStatus = (testStatus || "APRO").toUpperCase();
  const pixTxId = `NG${Date.now().toString(36).toUpperCase()}`;
  const status =
    method === "pix" || normalizedStatus === "CONT"
      ? "pending"
      : normalizedStatus === "APRO"
        ? "approved"
        : "rejected";

  return {
    id: method === "pix" ? `PIX-${pixTxId}` : `900${Date.now()}`,
    status,
    statusDetail: method === "pix" ? "pending_waiting_transfer" : getFallbackStatusDetail(normalizedStatus, status),
    paymentMethodId: method === "pix" ? "pix" : "sandbox_card",
    paymentTypeId: method === "pix" ? "bank_transfer" : "credit_card",
    totalPaidAmount: status === "approved" ? total : 0,
    qrCode: method === "pix" ? buildPixPayload({ total, txId: pixTxId }) : undefined,
    expiresAt: method === "pix" ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : undefined,
  };
}

function buildPixPayload({ total, txId }: { total: number; txId: string }) {
  const merchantAccount = emv("00", "BR.GOV.BCB.PIX") + emv("01", "pagamentos@nightguide.test") + emv("02", "NIGHTGUIDE TESTE");
  const additionalData = emv("05", txId.slice(0, 25));
  const amount = total.toFixed(2);
  const payload =
    emv("00", "01") +
    emv("26", merchantAccount) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", amount) +
    emv("58", "BR") +
    emv("59", "NIGHTGUIDE TESTE") +
    emv("60", "SAQUAREMA") +
    emv("62", additionalData) +
    "6304";

  return `${payload}${crc16(payload)}`;
}

function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function getFallbackStatusDetail(testStatus: string, status: string) {
  if (status === "approved") return "accredited";
  if (testStatus === "CONT") return "pending_contingency";
  if (testStatus === "CALL") return "cc_rejected_call_for_authorize";
  if (testStatus === "FUND") return "cc_rejected_insufficient_amount";
  if (testStatus === "SECU") return "cc_rejected_bad_filled_security_code";
  if (testStatus === "EXPI") return "cc_rejected_bad_filled_date";
  if (testStatus === "FORM") return "cc_rejected_bad_filled_other";
  return "cc_rejected_other_reason";
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
