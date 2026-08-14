import type { FeaturedEvent } from "@/lib/types";

export type FakePaymentMethod = "card" | "pix" | "wallet";

export type FakeTicket = {
  id: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  date: string;
  time: string;
  priceLabel: string;
  unitAmount: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: FakePaymentMethod;
  paymentLabel: string;
  status: "approved";
  createdAt: string;
  buyerEmail: string;
  provider?: "mercadopago" | "demo";
  providerPaymentId?: string;
  providerStatus?: string;
};

export const ticketsStorageBaseKey = "nightguide-tickets";
export const walletStorageBaseKey = "nightguide-wallet";

export function parseEventPrice(price: string) {
  const value = Number(price.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

export function getPaymentLabel(method: FakePaymentMethod) {
  if (method === "card") return "Cartao de credito teste";
  if (method === "pix") return "Pix teste";
  return "Credito NightGuide";
}

export function createFakeTicket({
  event,
  quantity,
  paymentMethod,
  paymentLabel,
  buyerEmail,
  provider = "demo",
  providerPaymentId,
  providerStatus,
}: {
  event: FeaturedEvent;
  quantity: number;
  paymentMethod: FakePaymentMethod;
  paymentLabel?: string;
  buyerEmail: string;
  provider?: "mercadopago" | "demo";
  providerPaymentId?: string;
  providerStatus?: string;
}): FakeTicket {
  const unitAmount = parseEventPrice(event.price);

  return {
    id: `NG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    eventId: event.id,
    eventTitle: event.title,
    venue: event.venue,
    date: event.date,
    time: event.time,
    priceLabel: event.price,
    unitAmount,
    quantity,
    totalAmount: unitAmount * quantity,
    paymentMethod,
    paymentLabel: paymentLabel ?? getPaymentLabel(paymentMethod),
    status: "approved",
    createdAt: new Date().toISOString(),
    buyerEmail,
    provider,
    providerPaymentId,
    providerStatus,
  };
}
