import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCards, demoInstallments, splitDemoInstallments } from '../src/lib/demo-card-checkout.ts';

test('cartões fictícios têm apenas os quatro dígitos visíveis e parcelas preservam o total', () => {
  assert.equal(demoCards.length, 3);
  assert.ok(demoCards.every(card => /^\d{4}$/.test(card.lastFour)));
  for (const count of demoInstallments) {
    const plan = splitDemoInstallments(20, count);
    assert.equal(Math.round((plan.first + plan.other * (count - 1)) * 100), 2000);
  }
  assert.deepEqual(splitDemoInstallments(20, 3), { first: 6.68, other: 6.66, total: 20 });
});
