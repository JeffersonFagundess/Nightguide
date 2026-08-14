"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, CheckCircle2, Clock3, Copy, CreditCard, Minus, Plus, QrCode, ShieldCheck, Ticket, X } from "lucide-react";
import { getClientUserScope, scopedStorageKey } from "@/lib/client-user-scope";
import {
  createFakeTicket,
  formatBRL,
  parseEventPrice,
  ticketsStorageBaseKey,
  type FakePaymentMethod,
  type FakeTicket,
} from "@/lib/fake-tickets";
import { queueOfflineAction } from "@/lib/offline-sync";
import { copy, usePreferences } from "@/lib/preferences";
import type { FeaturedEvent } from "@/lib/types";

type Props = {
  event: FeaturedEvent;
  buyerEmail: string;
  initialPayment?: {
    id?: string;
    status?: string;
  };
};

type CheckoutMethod = "card" | "pix";

type TestCard = {
  id: string;
  brand: string;
  number: string;
  cvv: string;
  expiry: string;
  paymentMethodId: string;
  issuerId: number;
  color: string;
};

type MercadoPagoPayment = {
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

const testCards: TestCard[] = [
  {
    id: "master",
    brand: "Mastercard",
    number: "5031 4332 1540 6351",
    cvv: "123",
    expiry: "11/30",
    paymentMethodId: "master",
    issuerId: 24,
    color: "from-[#16171d] to-[#515a68]",
  },
  {
    id: "visa",
    brand: "Visa",
    number: "4235 6477 2802 5682",
    cvv: "123",
    expiry: "11/30",
    paymentMethodId: "visa",
    issuerId: 25,
    color: "from-[#10203b] to-[#355fb8]",
  },
  {
    id: "amex",
    brand: "American Express",
    number: "3753 651535 56885",
    cvv: "1234",
    expiry: "11/30",
    paymentMethodId: "amex",
    issuerId: 18,
    color: "from-[#123333] to-[#2f8a8a]",
  },
  {
    id: "elo-debit",
    brand: "Elo debito",
    number: "5067 7667 8388 8311",
    cvv: "123",
    expiry: "11/30",
    paymentMethodId: "debelo",
    issuerId: 687,
    color: "from-[#2b160d] to-[#a74824]",
  },
];

const statusPresets = ["APRO", "OTHE", "CONT", "CALL", "FUND", "SECU", "EXPI", "FORM"];

export function FakeCheckout({ event, buyerEmail, initialPayment }: Props) {
  const { language } = usePreferences();
  const labels = checkoutCopy[language];
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<CheckoutMethod>("card");
  const [selectedCardId, setSelectedCardId] = useState(testCards[0].id);
  const [holder, setHolder] = useState("APRO");
  const [cardNumber, setCardNumber] = useState(testCards[0].number);
  const [expiry, setExpiry] = useState(testCards[0].expiry);
  const [cvv, setCvv] = useState(testCards[0].cvv);
  const [cpf, setCpf] = useState("12345678909");
  const [payerEmail, setPayerEmail] = useState(buyerEmail);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixPayment, setPixPayment] = useState<MercadoPagoPayment | null>(null);
  const [checkingPix, setCheckingPix] = useState(false);
  const [confirmingPix, setConfirmingPix] = useState(false);
  const [ticketKey, setTicketKey] = useState(scopedStorageKey(ticketsStorageBaseKey, "guest"));
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<FakeTicket | null>(null);

  const unitAmount = useMemo(() => parseEventPrice(event.price), [event.price]);
  const total = unitAmount * quantity;
  const isFree = total === 0;
  const selectedCard = testCards.find((card) => card.id === selectedCardId) ?? testCards[0];

  const issueTicket = useCallback(
    async ({
      paymentMethod,
      paymentLabel,
      provider,
      providerPaymentId,
      providerStatus,
    }: {
      paymentMethod: FakePaymentMethod;
      paymentLabel: string;
      provider: "mercadopago" | "demo";
      providerPaymentId?: string;
      providerStatus?: string;
    }) => {
      const stored = JSON.parse(window.localStorage.getItem(ticketKey) || "[]") as FakeTicket[];
      const existingTicket = providerPaymentId ? stored.find((item) => item.providerPaymentId === providerPaymentId) : undefined;
      if (existingTicket) {
        setPixModalOpen(false);
        setError("");
        setTicket(existingTicket);
        return;
      }

      const nextTicket = createFakeTicket({
        event,
        quantity,
        paymentMethod,
        paymentLabel,
        buyerEmail,
        provider,
        providerPaymentId,
        providerStatus,
      });

      window.localStorage.setItem(ticketKey, JSON.stringify([nextTicket, ...stored]));

      await queueOfflineAction({
        id: nextTicket.id,
        type: "ticket_purchased",
        entityType: "ticket",
        entityId: event.id,
        payload: {
          ticketId: nextTicket.id,
          eventId: event.id,
          eventTitle: event.title,
          venue: event.venue,
          quantity,
          totalAmount: total,
          paymentMethod,
          paymentLabel,
          buyerEmail,
          provider,
          providerPaymentId,
          providerStatus,
        },
      });

      setPixModalOpen(false);
      setError("");
      setTicket(nextTicket);
    },
    [buyerEmail, event, quantity, ticketKey, total],
  );

  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      const scope = await getClientUserScope();
      const nextTicketKey = scopedStorageKey(ticketsStorageBaseKey, scope.storageScope);
      if (!active) return;

      setTicketKey(nextTicketKey);
      setReady(true);
    }

    void loadCheckout();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || ticket || !initialPayment?.status) return;

    queueMicrotask(() => {
      const status = initialPayment.status?.toLowerCase();

      if (status === "approved" || status === "success") {
        void issueTicket({
          paymentMethod: "card",
          paymentLabel: `${labels.mercadoPagoCheckout} #${initialPayment.id || "checkout"}`,
          provider: "mercadopago",
          providerPaymentId: initialPayment.id || `checkout-${event.id}`,
          providerStatus: status,
        });
        return;
      }

      if (status === "pending") {
        setError(labels.pendingPayment);
        return;
      }

      if (status === "rejected" || status === "failure") {
        setError(labels.rejectedPayment);
      }
    });
  }, [
    event.id,
    initialPayment?.id,
    initialPayment?.status,
    issueTicket,
    labels.mercadoPagoCheckout,
    labels.pendingPayment,
    labels.rejectedPayment,
    ready,
    ticket,
  ]);

  function changeQuantity(nextQuantity: number) {
    setQuantity(Math.min(6, Math.max(1, nextQuantity)));
    setPixPayment(null);
  }

  function selectCard(card: TestCard) {
    setSelectedCardId(card.id);
    setCardNumber(card.number);
    setExpiry(card.expiry);
    setCvv(card.cvv);
    setError("");
  }

  async function confirmPurchase() {
    setError("");

    if (isFree) {
      await issueTicket({
        paymentMethod: "wallet",
        paymentLabel: labels.freeTicket,
        provider: "demo",
        providerStatus: "approved",
      });
      return;
    }

    if (method === "card") {
      await submitCardPayment();
      return;
    }

    await generatePixPayment();
  }

  async function submitCardPayment() {
    if (!isValidCardForm({ cardNumber, expiry, cvv, holder, cpf })) {
      setError(labels.cardError);
      return;
    }

    setProcessing(true);
    setError("");
    try {
      console.info("[NightGuide][MercadoPago] card token request", {
        eventId: event.id,
        cardLast4: cardNumber.replace(/\D/g, "").slice(-4),
        holder,
        selectedCard: selectedCard.paymentMethodId,
      });
      const tokenResponse = await fetch("/api/payments/mercadopago/card-token", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          cardNumber,
          expiry,
          cvv,
          holder,
          cpf,
        }),
      });
      const tokenData = (await tokenResponse.json()) as { token?: string; debugId?: string; error?: string };
      console.info("[NightGuide][MercadoPago] card token response", {
        ok: tokenResponse.ok,
        status: tokenResponse.status,
        debugId: tokenData.debugId,
        hasToken: Boolean(tokenData.token),
        error: tokenData.error,
      });
      if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || labels.cardTokenError);

      const paymentResponse = await fetch("/api/payments/mercadopago", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          method: "card",
          eventId: event.id,
          quantity,
          token: tokenData.token,
          paymentMethodId: selectedCard.paymentMethodId,
          issuerId: selectedCard.issuerId,
          installments: 1,
          payerEmail,
          identificationType: "CPF",
          identificationNumber: cpf,
          testStatus: holder,
        }),
      });
      const paymentData = (await paymentResponse.json()) as { payment?: MercadoPagoPayment; debugId?: string; error?: string };
      console.info("[NightGuide][MercadoPago] card payment response", {
        ok: paymentResponse.ok,
        status: paymentResponse.status,
        debugId: paymentData.debugId,
        paymentId: paymentData.payment?.id,
        paymentStatus: paymentData.payment?.status,
        statusDetail: paymentData.payment?.statusDetail,
        error: paymentData.error,
      });
      if (!paymentResponse.ok || !paymentData.payment) throw new Error(paymentData.error || labels.paymentError);

      if (paymentData.payment.status === "approved") {
        await issueTicket({
          paymentMethod: "card",
          paymentLabel: `${labels.mercadoPagoCard} #${paymentData.payment.id}`,
          provider: "mercadopago",
          providerPaymentId: paymentData.payment.id,
          providerStatus: paymentData.payment.status,
        });
        return;
      }

      setError(paymentData.payment.status === "pending" ? labels.pendingPayment : labels.rejectedPayment);
    } catch (caught) {
      console.error("[NightGuide][MercadoPago] card payment failed", caught);
      setError(caught instanceof Error ? caught.message : labels.paymentError);
    } finally {
      setProcessing(false);
    }
  }

  async function generatePixPayment() {
    setProcessing(true);
    setError("");
    setPixCopied(false);
    try {
      console.info("[NightGuide][MercadoPago] pix payment request", {
        eventId: event.id,
        eventTitle: event.title,
        quantity,
        total,
      });
      const response = await fetch("/api/payments/mercadopago", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          method: "pix",
          eventId: event.id,
          quantity,
          payerEmail,
          identificationType: "CPF",
          identificationNumber: cpf,
        }),
      });
      const data = (await response.json()) as { payment?: MercadoPagoPayment; debugId?: string; error?: string };
      console.info("[NightGuide][MercadoPago] pix payment response", {
        ok: response.ok,
        status: response.status,
        debugId: data.debugId,
        paymentId: data.payment?.id,
        paymentStatus: data.payment?.status,
        hasQrCode: Boolean(data.payment?.qrCode || data.payment?.qrCodeBase64),
        error: data.error,
      });
      if (!response.ok || !data.payment) throw new Error(data.error || labels.paymentError);

      setPixPayment(data.payment);
      setPixModalOpen(true);
    } catch (caught) {
      console.error("[NightGuide][MercadoPago] pix payment failed", caught);
      setError(caught instanceof Error ? caught.message : labels.paymentError);
    } finally {
      setProcessing(false);
    }
  }

  async function checkPixStatus() {
    if (!pixPayment) return;

    setCheckingPix(true);
    setError("");
    try {
      const response = await fetch(`/api/payments/mercadopago/${pixPayment.id}`, {
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as { payment?: MercadoPagoPayment; error?: string };
      if (!response.ok || !data.payment) throw new Error(data.error || labels.statusError);
      setPixPayment(data.payment);

      if (data.payment.status === "approved") {
        await issueTicket({
          paymentMethod: "pix",
          paymentLabel: `${labels.mercadoPagoPix} #${data.payment.id}`,
          provider: "mercadopago",
          providerPaymentId: data.payment.id,
          providerStatus: data.payment.status,
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.statusError);
    } finally {
      setCheckingPix(false);
    }
  }

  async function confirmPixDemo() {
    if (!pixPayment) return;

    setConfirmingPix(true);
    setError("");
    window.setTimeout(() => {
      void issueTicket({
        paymentMethod: "pix",
        paymentLabel: `${labels.mercadoPagoPixDemo} #${pixPayment.id}`,
        provider: "mercadopago",
        providerPaymentId: pixPayment.id,
        providerStatus: `${pixPayment.status}_demo_confirmed`,
      }).finally(() => setConfirmingPix(false));
    }, 850);
  }

  async function copyPix() {
    if (!pixPayment?.qrCode) {
      setError(labels.pixCodeMissing);
      return;
    }

    const showCopied = () => {
      setError("");
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2200);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixPayment.qrCode);
        showCopied();
        return;
      }

      if (copyTextFallback(pixPayment.qrCode)) {
        showCopied();
        return;
      }
    } catch {
      if (copyTextFallback(pixPayment.qrCode)) {
        showCopied();
        return;
      }
    }

    setError(labels.copyError);
  }

  if (ticket) {
    return (
      <>
        <SuccessOverlay labels={labels} ticket={ticket} onClose={() => setTicket(null)} />
        <aside className="rounded-[8px] border border-[color:var(--accent)]/40 bg-[color:var(--panel)] p-5 shadow-2xl shadow-black/25">
          <div className="rounded-[8px] border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/12 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[color:var(--accent)] text-[color:var(--ink)]">
                <CheckCircle2 size={25} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">{labels.paymentConfirmed}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{labels.paymentConfirmedText}</p>
              </div>
            </div>
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-[color:var(--foreground)]">{labels.ticketReady}</h2>
          <TicketSummary labels={labels} ticket={ticket} />
          <a className="primary-button mt-4" href="/conta">
            <Ticket size={18} aria-hidden />
            {labels.viewAccount}
          </a>
        </aside>
      </>
    );
  }

  return (
    <aside className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5">
      <CreditCard className="text-[color:var(--accent)]" size={28} aria-hidden />
      <h2 className="mt-4 text-2xl font-semibold text-[color:var(--foreground)]">{labels.title}</h2>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{labels.text}</p>

      <div className="mt-5 rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[color:var(--muted)]">{labels.quantity}</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{event.price}</p>
          </div>
          <div className="flex items-center rounded-[8px] border border-white/10">
            <button onClick={() => changeQuantity(quantity - 1)} className="grid h-10 w-10 place-items-center" aria-label={labels.remove}>
              <Minus size={16} aria-hidden />
            </button>
            <strong className="min-w-10 text-center text-[color:var(--foreground)]">{quantity}</strong>
            <button onClick={() => changeQuantity(quantity + 1)} className="grid h-10 w-10 place-items-center" aria-label={labels.add}>
              <Plus size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-[color:var(--muted)]">{labels.total}</span>
          <strong className="text-2xl text-[color:var(--foreground)]">{isFree ? labels.free : formatBRL(total)}</strong>
        </div>
      </div>

      {!isFree ? (
        <div className="mt-5 rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">Mercado Pago</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{labels.checkoutApiText}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => {
                setMethod("card");
                setError("");
              }}
              className={`flex min-h-11 items-center gap-3 rounded-[8px] border px-3 text-left text-sm font-semibold transition ${
                method === "card"
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)]/12 text-[color:var(--foreground)]"
                  : "border-white/10 bg-white/[0.03] text-[color:var(--foreground)] hover:bg-white/[0.06]"
              }`}
            >
              <CreditCard className="text-[color:var(--accent)]" size={18} aria-hidden />
              {labels.card}
            </button>
            <button
              onClick={() => {
                setMethod("pix");
                setError("");
              }}
              className={`flex min-h-11 items-center gap-3 rounded-[8px] border px-3 text-left text-sm font-semibold transition ${
                method === "pix"
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)]/12 text-[color:var(--foreground)]"
                  : "border-white/10 bg-white/[0.03] text-[color:var(--foreground)] hover:bg-white/[0.06]"
              }`}
            >
              <QrCode className="text-[color:var(--accent)]" size={18} aria-hidden />
              {labels.pix}
            </button>
          </div>
        </div>
      ) : null}

      {method === "card" && !isFree ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {testCards.map((card) => (
              <button
                key={card.id}
                onClick={() => selectCard(card)}
                className={`overflow-hidden rounded-[8px] border text-left transition ${
                  selectedCardId === card.id ? "border-[color:var(--accent)]" : "border-white/10"
                }`}
              >
                <span className={`block bg-gradient-to-br ${card.color} p-3`}>
                  <span className="flex items-center justify-between gap-2 text-white">
                    <span className="text-sm font-semibold">{card.brand}</span>
                    {selectedCardId === card.id ? <Check size={16} aria-hidden /> : null}
                  </span>
                  <span className="mt-4 block font-mono text-sm text-white">**** {card.number.slice(-4)}</span>
                </span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">{labels.testStatus}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {statusPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setHolder(preset)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${
                    holder.toUpperCase() === preset
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--ink)]"
                      : "border-white/10 text-[color:var(--muted)]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-3">
            <input value={holder} onChange={(event) => setHolder(event.target.value.toUpperCase())} className="field-input" placeholder="APRO" />
            <input value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} className="field-input" placeholder="test@testuser.com" />
            <input
              value={cardNumber}
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
              className="field-input"
              placeholder={selectedCard.number}
              inputMode="numeric"
            />
            <div className="grid grid-cols-3 gap-3">
              <input value={expiry} onChange={(event) => setExpiry(formatExpiry(event.target.value))} className="field-input" placeholder="11/30" />
              <input value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))} className="field-input" placeholder="123" inputMode="numeric" />
              <input value={cpf} onChange={(event) => setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))} className="field-input" placeholder="CPF" inputMode="numeric" />
            </div>
          </div>
        </div>
      ) : null}

      {method === "pix" && !isFree ? (
        <div className="mt-4 rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{pixPayment ? labels.pixReady : labels.pixPending}</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{labels.pixSummary}</p>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-[color:var(--accent)]">
              <QrCode size={18} aria-hidden />
            </span>
          </div>
          {pixPayment ? (
            <button
              onClick={() => {
                setPixCopied(false);
                setPixModalOpen(true);
              }}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-white/10 px-3 text-sm font-semibold text-[color:var(--foreground)]"
            >
              <QrCode size={16} aria-hidden />
              {labels.openPix}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-3 text-xs leading-5 text-[color:var(--muted)]">
        <ShieldCheck className="shrink-0 text-[color:var(--accent)]" size={18} aria-hidden />
        {labels.safe}
      </div>

      {error ? <p className="mt-3 rounded-[6px] border border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 p-3 text-sm">{error}</p> : null}

      <button
        onClick={confirmPurchase}
        disabled={!ready || processing}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-4 font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CreditCard size={18} aria-hidden />
        {processing ? labels.processing : getConfirmLabel({ labels, method, isFree, hasPixPayment: Boolean(pixPayment) })}
      </button>

      {pixModalOpen && pixPayment ? (
        <PixModal
          labels={labels}
          payment={pixPayment}
          total={total}
          pixCopied={pixCopied}
          checking={checkingPix}
          confirming={confirmingPix}
          onClose={() => setPixModalOpen(false)}
          onCopy={copyPix}
          onCheck={checkPixStatus}
          onConfirmDemo={confirmPixDemo}
        />
      ) : null}

    </aside>
  );
}

function PixModal({
  labels,
  payment,
  total,
  pixCopied,
  checking,
  confirming,
  onClose,
  onCopy,
  onCheck,
  onConfirmDemo,
}: {
  labels: Record<string, string>;
  payment: MercadoPagoPayment;
  total: number;
  pixCopied: boolean;
  checking: boolean;
  confirming: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCheck: () => void;
  onConfirmDemo: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const isSimulated = isSimulatedPixPayment(payment);
  const qrImageSrc = payment.qrCodeBase64 ? `data:image/png;base64,${payment.qrCodeBase64}` : payment.qrCode ? qrDataUrl : "";

  useEffect(() => {
    if (payment.qrCodeBase64 || !payment.qrCode) return;

    let active = true;

    QRCode.toDataURL(payment.qrCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
      color: {
        dark: "#15100e",
        light: "#ffffff",
      },
    })
      .then((nextQr) => {
        if (active) setQrDataUrl(nextQr);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [payment.qrCode, payment.qrCodeBase64]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pix-payment-title"
        className="max-h-[calc(100dvh-24px)] w-full max-w-md overflow-y-auto rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-4 shadow-2xl shadow-black/50 [scrollbar-width:none] sm:max-h-[calc(100dvh-48px)] sm:p-5 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">{labels.pixEnvironment}</p>
            <h3 id="pix-payment-title" className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              {labels.pixTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-[6px] bg-white/[0.06] text-[color:var(--foreground)] transition hover:bg-white/[0.12]"
            aria-label={labels.closePix}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <p className="mt-2 text-sm leading-5 text-[color:var(--muted)]">{labels.pixText}</p>

        <div className="mt-4 grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-3">
          <PixStatusItem label={labels.pixStepOne} value={labels.pixStepOneText} active />
          <PixStatusItem label={labels.pixStepTwo} value={labels.pixStepTwoText} active={pixCopied} />
          <PixStatusItem label={labels.pixStepThree} value={labels.pixStepThreeText} active={confirming} />
        </div>

        <div className="mt-3 rounded-[8px] border border-white/10 bg-white p-3 text-[#15100e]">
          <div className="grid place-items-center rounded-[6px] bg-white p-2">
            {qrImageSrc ? (
              <Image
                src={qrImageSrc}
                alt={labels.pixQrAlt}
                width={320}
                height={320}
                unoptimized
                className="h-[clamp(170px,34vh,260px)] w-[clamp(170px,34vh,260px)] object-contain"
              />
            ) : (
              <QrCode className="h-[clamp(112px,24vh,180px)] w-[clamp(112px,24vh,180px)]" aria-hidden />
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[6px] bg-[#f1eee9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6258]">{labels.total}</p>
              <p className="mt-1 text-lg font-bold">{formatBRL(total)}</p>
            </div>
            <div className="rounded-[6px] bg-[#f1eee9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6258]">{labels.pixStatus}</p>
              <p className="mt-1 text-sm font-bold">{labels.pixStatusPending}</p>
            </div>
          </div>
          <div className="mt-2 rounded-[6px] bg-[#f1eee9] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6258]">{labels.pixPaymentId}</p>
                <p className="mt-1 font-mono text-xs font-bold">{payment.id}</p>
              </div>
              <span className="rounded-full bg-[#15100e] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                {isSimulated ? labels.pixSimulatedBadge : labels.pixMpBadge}
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-[6px] bg-[#f1eee9] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6258]">{labels.pixExpires}</p>
            <p className="mt-1 text-sm font-semibold">{labels.pixExpiresText}</p>
          </div>
          <div className="mt-2 rounded-[6px] bg-[#f1eee9] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6258]">{labels.pixCode}</p>
              {pixCopied ? <span className="text-xs font-bold text-[#1f7a4d]">{labels.pixCopied}</span> : null}
            </div>
            <p className="mt-1 break-all font-mono text-[11px] leading-4">{payment.qrCode ?? labels.pixCodeMissing}</p>
          </div>
        </div>

        <div className="mt-3 rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--accent)]/12 text-[color:var(--accent)]">
              <Clock3 size={18} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{labels.pixWaitingTitle}</p>
              <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">{labels.pixWaitingText}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onCopy}
          className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] border px-3 text-sm font-semibold transition ${
            pixCopied
              ? "border-[color:var(--accent)] bg-[color:var(--accent)]/12 text-[color:var(--accent)]"
              : "border-white/10 text-[color:var(--foreground)] hover:bg-white/[0.06]"
          }`}
        >
          {pixCopied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {pixCopied ? labels.pixCopied : labels.copyPix}
        </button>
        <p role="status" className="mt-2 min-h-4 text-center text-xs font-semibold text-[color:var(--accent)]">
          {pixCopied ? labels.pixCopiedToast : ""}
        </p>

        <div className="grid gap-2">
          {!isSimulated ? (
            <button
              onClick={onCheck}
              disabled={checking || confirming}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-white/10 px-4 text-sm font-semibold text-[color:var(--foreground)] disabled:opacity-60"
            >
              <QrCode size={16} aria-hidden />
              {checking ? labels.checkingPix : labels.checkPix}
            </button>
          ) : null}
          <button
            onClick={onConfirmDemo}
            disabled={confirming}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-4 font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--accent-strong)] disabled:opacity-70"
          >
            <CheckCircle2 size={18} aria-hidden />
            {confirming ? labels.pixConfirming : labels.pixConfirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}

function PixStatusItem({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-[6px] border p-3 ${active ? "border-[color:var(--accent)]/35 bg-[color:var(--accent)]/10" : "border-white/10 bg-white/[0.03]"}`}>
      <span className={`grid h-6 w-6 place-items-center rounded-full ${active ? "bg-[color:var(--accent)] text-[color:var(--ink)]" : "bg-white/[0.08] text-[color:var(--muted)]"}`}>
        <Check size={13} aria-hidden />
      </span>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">{label}</p>
      <p className="mt-1 text-xs leading-4 text-[color:var(--muted)]">{value}</p>
    </div>
  );
}

function isSimulatedPixPayment(payment: MercadoPagoPayment) {
  return payment.id.startsWith("PIX-") || payment.id.startsWith("900");
}

function SuccessOverlay({
  labels,
  ticket,
  onClose,
}: {
  labels: Record<string, string>;
  ticket: FakeTicket;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-success-title"
        className="w-full max-w-md rounded-[8px] border border-[color:var(--accent)]/45 bg-[color:var(--panel)] p-5 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-[color:var(--accent)] text-[color:var(--ink)]">
              <CheckCircle2 size={27} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">{labels.paymentConfirmed}</p>
              <h3 id="payment-success-title" className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">
                {labels.ticketReady}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-[6px] bg-white/[0.06] text-[color:var(--foreground)] transition hover:bg-white/[0.12]"
            aria-label={labels.closeSuccess}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{labels.paymentConfirmedText}</p>
        <TicketSummary labels={labels} ticket={ticket} compact />

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a className="primary-button min-h-11" href="/conta">
            <Ticket size={18} aria-hidden />
            {labels.viewAccount}
          </a>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-[6px] border border-white/10 px-4 font-semibold text-[color:var(--foreground)]"
          >
            {labels.continueBrowsing}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketSummary({ labels, ticket, compact = false }: { labels: Record<string, string>; ticket: FakeTicket; compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-4" : "mt-5"} rounded-[8px] border border-white/10 bg-white/[0.04] p-4`}>
      <p className="font-mono text-sm text-[color:var(--accent)]">{ticket.id}</p>
      <p className="mt-2 font-semibold text-[color:var(--foreground)]">{ticket.eventTitle}</p>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        {ticket.quantity}x - {ticket.paymentLabel}
      </p>
      {ticket.providerPaymentId ? (
        <p className="mt-2 font-mono text-xs text-[color:var(--muted)]">Mercado Pago: {ticket.providerPaymentId}</p>
      ) : null}
      {!compact ? (
        <div className="mt-4 grid aspect-square max-h-40 place-items-center rounded-[8px] bg-white p-3 text-[#15100e]">
          <QrCode size={92} aria-label={labels.ticketReady} />
        </div>
      ) : null}
    </div>
  );
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function getConfirmLabel({
  labels,
  method,
  isFree,
  hasPixPayment,
}: {
  labels: Record<string, string>;
  method: CheckoutMethod | null;
  isFree: boolean;
  hasPixPayment: boolean;
}) {
  if (isFree) return labels.confirmFree;
  if (method === "card") return labels.confirmCard;
  if (method === "pix") return hasPixPayment ? labels.openPix : labels.generatePix;
  return labels.chooseFirst;
}

function isValidCardForm({
  cardNumber,
  expiry,
  cvv,
  holder,
  cpf,
}: {
  cardNumber: string;
  expiry: string;
  cvv: string;
  holder: string;
  cpf: string;
}) {
  const digits = cardNumber.replace(/\D/g, "");
  const cvvDigits = cvv.replace(/\D/g, "");
  const cpfDigits = cpf.replace(/\D/g, "");
  const [monthRaw, yearRaw] = expiry.split("/");
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  return (
    digits.length >= 12 &&
    cvvDigits.length >= 3 &&
    cpfDigits.length === 11 &&
    holder.trim().length >= 2 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(year) &&
    year >= 26
  );
}

function copyTextFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

const checkoutCopy = {
  pt: {
    title: "Checkout Mercado Pago",
    text: "Use as credenciais e cartoes de teste do Mercado Pago. Nenhuma cobranca real e feita.",
    quantity: "Quantidade",
    total: "Total",
    free: "Gratis",
    chooseMethod: "Forma de pagamento",
    card: "Cartao",
    pix: "Pix",
    checkoutApiText: "Pague direto no NightGuide com a API de teste do Mercado Pago. Nao abre tela externa e nenhuma cobranca real e feita.",
    checkoutProText: "Voce sera redirecionado para o checkout oficial do Mercado Pago para escolher Pix ou cartao com seguranca.",
    testStatus: "Resultado do teste",
    pixEnvironment: "Ambiente de teste",
    pixTitle: "Pix copia e cola",
    pixText: "Use o QR ou copie o codigo abaixo. Como o Pix real esta indisponivel nas credenciais de teste, esta etapa simula a confirmacao com o mesmo fluxo visual.",
    pixPending: "Pix ainda nao gerado",
    pixReady: "Pix teste gerado",
    pixSummary: "Gere o QR, copie o codigo e confirme a simulacao para liberar o ingresso.",
    openPix: "Abrir Pix",
    closePix: "Fechar Pix",
    pixConfirmButton: "Confirmar pagamento Pix teste",
    pixConfirming: "Confirmando pagamento...",
    checkPix: "Verificar status no Mercado Pago",
    checkingPix: "Verificando...",
    pixQrAlt: "QR Code Pix Mercado Pago",
    pixCode: "Pix copia e cola",
    pixPaymentId: "Identificador",
    pixStatus: "Status",
    pixStatusPending: "Aguardando pagamento",
    pixExpires: "Validade",
    pixExpiresText: "30 minutos no ambiente de teste",
    pixSimulatedBadge: "Teste",
    pixMpBadge: "Mercado Pago",
    pixWaitingTitle: "Aguardando confirmacao",
    pixWaitingText: "No teste, clique em confirmar para simular o retorno do banco, aprovar a compra e salvar o ingresso na conta.",
    pixStepOne: "Gerado",
    pixStepOneText: "Codigo criado",
    pixStepTwo: "Copiado",
    pixStepTwoText: "Pronto para pagar",
    pixStepThree: "Confirmacao",
    pixStepThreeText: "Libera ingresso",
    pixCodeMissing: "Codigo Pix indisponivel",
    pixCopied: "Codigo Pix copiado",
    pixCopiedToast: "Codigo Pix copiado para a area de transferencia.",
    copyError: "Nao consegui copiar automaticamente. Selecione o codigo Pix manualmente.",
    copyPix: "Copiar Pix copia e cola",
    safe: "Checkout oficial do Mercado Pago. O Access Token fica apenas no servidor.",
    chooseFirst: "Escolha o metodo de pagamento",
    goMercadoPago: "Ir para o Mercado Pago",
    preferenceError: "Nao foi possivel abrir o checkout do Mercado Pago.",
    generatePix: "Gerar Pix Mercado Pago",
    confirmCard: "Pagar com cartao teste",
    confirmFree: "Gerar ingresso gratis",
    processing: "Processando...",
    methodError: "Escolha uma forma de pagamento para continuar.",
    cardError: "Preencha cartao, validade, CVV, nome de teste e CPF corretamente.",
    cardTokenError: "Nao foi possivel tokenizar o cartao no Mercado Pago.",
    publicKeyError: "Public Key do Mercado Pago nao configurada.",
    paymentError: "Erro ao processar pagamento no Mercado Pago.",
    statusError: "Nao foi possivel consultar o status do pagamento.",
    rejectedPayment: "Pagamento recusado pelo Mercado Pago",
    pendingPayment: "Pagamento ficou pendente no Mercado Pago",
    paymentNotApproved: "Pagamento nao aprovado",
    paymentConfirmed: "Pagamento confirmado",
    paymentConfirmedText: "Compra aprovada no teste e ingresso salvo na sua conta.",
    ticketReady: "Ingresso gerado",
    viewAccount: "Ver em Minha conta",
    continueBrowsing: "Continuar no site",
    closeSuccess: "Fechar confirmacao",
    add: "Adicionar ingresso",
    remove: "Remover ingresso",
    freeTicket: "Ingresso gratis",
    mercadoPagoCard: "Mercado Pago cartao",
    mercadoPagoPix: "Mercado Pago Pix",
    mercadoPagoPixDemo: "Pix teste confirmado",
    mercadoPagoCheckout: "Mercado Pago Checkout",
  },
  en: {
    title: "Mercado Pago Checkout",
    text: "Use Mercado Pago test credentials and cards. No real charge is made.",
    quantity: "Quantity",
    total: "Total",
    free: "Free",
    chooseMethod: "Payment method",
    card: "Card",
    pix: "Pix",
    checkoutApiText: "Pay inside NightGuide with Mercado Pago's test API. No external checkout opens and no real charge is made.",
    checkoutProText: "You will be redirected to Mercado Pago's official checkout to choose Pix or card securely.",
    testStatus: "Test result",
    pixEnvironment: "Test environment",
    pixTitle: "Pix copy and paste",
    pixText: "Use the QR or copy the code below. Because real Pix is unavailable for these test credentials, this step simulates confirmation with the same visual flow.",
    pixPending: "Pix not generated yet",
    pixReady: "Test Pix generated",
    pixSummary: "Generate the QR, copy the code and confirm the simulation to release the ticket.",
    openPix: "Open Pix",
    closePix: "Close Pix",
    pixConfirmButton: "Confirm test Pix payment",
    pixConfirming: "Confirming payment...",
    checkPix: "Check Mercado Pago status",
    checkingPix: "Checking...",
    pixQrAlt: "Mercado Pago Pix QR Code",
    pixCode: "Pix copy and paste",
    pixPaymentId: "Identifier",
    pixStatus: "Status",
    pixStatusPending: "Waiting for payment",
    pixExpires: "Expires",
    pixExpiresText: "30 minutes in the test environment",
    pixSimulatedBadge: "Test",
    pixMpBadge: "Mercado Pago",
    pixWaitingTitle: "Waiting for confirmation",
    pixWaitingText: "In the test, click confirm to simulate the bank callback, approve the purchase and save the ticket to the account.",
    pixStepOne: "Generated",
    pixStepOneText: "Code created",
    pixStepTwo: "Copied",
    pixStepTwoText: "Ready to pay",
    pixStepThree: "Confirmation",
    pixStepThreeText: "Releases ticket",
    pixCodeMissing: "Pix code unavailable",
    pixCopied: "Pix code copied",
    pixCopiedToast: "Pix code copied to clipboard.",
    copyError: "I could not copy automatically. Select the Pix code manually.",
    copyPix: "Copy Pix code",
    safe: "Official Mercado Pago checkout. The Access Token stays only on the server.",
    chooseFirst: "Choose payment method",
    goMercadoPago: "Go to Mercado Pago",
    preferenceError: "Could not open Mercado Pago checkout.",
    generatePix: "Generate Mercado Pago Pix",
    confirmCard: "Pay with test card",
    confirmFree: "Generate free ticket",
    processing: "Processing...",
    methodError: "Choose a payment method to continue.",
    cardError: "Fill card, expiry, CVV, test name and CPF correctly.",
    cardTokenError: "Could not tokenize the card in Mercado Pago.",
    publicKeyError: "Mercado Pago Public Key is not configured.",
    paymentError: "Error processing payment in Mercado Pago.",
    statusError: "Could not check payment status.",
    rejectedPayment: "Payment rejected by Mercado Pago",
    pendingPayment: "Payment is pending in Mercado Pago",
    paymentNotApproved: "Payment not approved",
    paymentConfirmed: "Payment confirmed",
    paymentConfirmedText: "Test purchase approved and ticket saved to your account.",
    ticketReady: "Ticket generated",
    viewAccount: "View in My account",
    continueBrowsing: "Continue on site",
    closeSuccess: "Close confirmation",
    add: "Add ticket",
    remove: "Remove ticket",
    freeTicket: "Free ticket",
    mercadoPagoCard: "Mercado Pago card",
    mercadoPagoPix: "Mercado Pago Pix",
    mercadoPagoPixDemo: "Test Pix confirmed",
    mercadoPagoCheckout: "Mercado Pago Checkout",
  },
} satisfies Record<keyof typeof copy, Record<string, string>>;
