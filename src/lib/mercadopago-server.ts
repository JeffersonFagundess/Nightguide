import { getHomeData } from "@/lib/data";
import { parseEventPrice } from "@/lib/fake-tickets";
import { fallbackEvents } from "@/lib/mock-data";
import type { FeaturedEvent } from "@/lib/types";

const mercadoPagoBaseUrl = "https://api.mercadopago.com";

export type MercadoPagoNormalizedPayment = {
  id: string;
  status: string;
  statusDetail: string;
  paymentMethodId: string;
  paymentTypeId: string;
  totalPaidAmount: number;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
};

type MercadoPagoPaymentResponse = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount?: number;
  transaction_details?: {
    total_paid_amount?: number;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  message?: string;
  error?: string;
  cause?: Array<{ code?: string | number; description?: string }>;
};

export function getMercadoPagoPublicKey() {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";
}

export function getMercadoPagoAccessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
}

export async function findCheckoutEvent(eventId: string) {
  const { events } = await getHomeData();
  return events.find((item) => item.id === eventId) ?? fallbackEvents.find((item) => item.id === eventId) ?? null;
}

export function getTicketTotal(event: FeaturedEvent, quantity: number) {
  return Number((parseEventPrice(event.price) * quantity).toFixed(2));
}

export function normalizeMercadoPagoPayment(payment: MercadoPagoPaymentResponse): MercadoPagoNormalizedPayment {
  return {
    id: String(payment.id ?? ""),
    status: payment.status ?? "unknown",
    statusDetail: payment.status_detail ?? "",
    paymentMethodId: payment.payment_method_id ?? "",
    paymentTypeId: payment.payment_type_id ?? "",
    totalPaidAmount: Number(payment.transaction_details?.total_paid_amount ?? payment.transaction_amount ?? 0),
    qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
    ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
  };
}

export async function mercadoPagoFetch<T>(path: string, init: RequestInit = {}) {
  const accessToken = getMercadoPagoAccessToken();

  if (!accessToken) {
    throw new Error("Mercado Pago Access Token nao configurado.");
  }

  const response = await fetch(`${mercadoPagoBaseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  const text = await response.text();
  const data = parseMercadoPagoResponse(text, response.status) as T & MercadoPagoPaymentResponse;

  if (!response.ok) {
    throw new Error(formatMercadoPagoError(data));
  }

  return data as T;
}

export function isRecoverableMercadoPagoTestError(message: string) {
  return /communication_error|invalid users involved|payer email forbidden|payer\.email|http 500/i.test(message);
}

function formatMercadoPagoError(error: MercadoPagoPaymentResponse) {
  const firstCause = error.cause?.find((item) => item.description);
  return firstCause?.description ?? error.message ?? error.error ?? "Erro ao processar pagamento no Mercado Pago.";
}

function parseMercadoPagoResponse(text: string, status: number) {
  if (!text) return { message: `Mercado Pago retornou HTTP ${status} sem corpo.` };

  try {
    return JSON.parse(text) as MercadoPagoPaymentResponse;
  } catch {
    return { message: `Mercado Pago retornou HTTP ${status}: ${text.slice(0, 180)}` };
  }
}
