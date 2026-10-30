export const demoCards = [
  { id: 'visa', brand: 'Visa', lastFour: '4242' },
  { id: 'mastercard', brand: 'Mastercard', lastFour: '5454' },
  { id: 'elo', brand: 'Elo', lastFour: '6363' },
] as const;

export const demoInstallments = [1, 2, 3, 4, 6] as const;

export function splitDemoInstallments(total: number, count: number) {
  if (!Number.isFinite(total) || total < 0 || !Number.isInteger(count) || count < 1 || count > 12) {
    throw new Error('Parcelamento de demonstração inválido.');
  }
  const cents = Math.round(total * 100);
  const otherCents = Math.floor(cents / count);
  const firstCents = cents - otherCents * (count - 1);
  return { first: firstCents / 100, other: otherCents / 100, total: cents / 100 };
}
