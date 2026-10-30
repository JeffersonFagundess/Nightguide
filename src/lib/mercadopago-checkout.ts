export type CheckoutSearchPayment = {
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
};

export function selectCheckoutPayment<T extends CheckoutSearchPayment>(payments: T[], reference: string, expectedAmount: number): T | null {
  const matches = payments.filter(payment =>
    payment.external_reference === reference &&
    Number.isFinite(payment.transaction_amount) &&
    Math.abs(Number(payment.transaction_amount) - expectedAmount) < 0.01,
  );
  return matches.find(payment => payment.status === "approved") ?? matches[0] ?? null;
}
