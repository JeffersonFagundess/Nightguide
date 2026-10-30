import { getHomeData } from "@/lib/data";
import { parseEventPrice } from "@/lib/fake-tickets";
import { fallbackEvents } from "@/lib/mock-data";
import type { FeaturedEvent } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

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
  if (hasSupabaseEnv() && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(eventId)) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("events")
      .select("id,title,starts_at,price,genre,cover_url,description,venues(name)")
      .eq("id", eventId).eq("status", "published").single();
    if (error || !data) return null;
    const venue = Array.isArray(data.venues) ? data.venues[0]?.name : (data.venues as { name?: string } | null)?.name;
    const startsAt = new Date(data.starts_at);
    return {
      id: data.id,
      title: data.title,
      venue: venue ?? "Local a confirmar",
      date: startsAt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
      time: startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      genre: data.genre ?? "Evento",
      price: Number(data.price) > 0 ? `R$ ${Number(data.price).toFixed(2)}` : "Grátis",
      image: data.cover_url ?? fallbackEvents[0].image,
      highlight: data.description ?? "Evento NightGuide.",
      mood: data.genre ?? "Ao vivo",
      distance: "Saquarema",
    } satisfies FeaturedEvent;
  }
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
