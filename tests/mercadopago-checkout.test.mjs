import assert from 'node:assert/strict';
import test from 'node:test';
import { selectCheckoutPayment } from '../src/lib/mercadopago-checkout.ts';
import { getCheckoutBackUrls, getCheckoutSiteOrigin } from '../src/lib/mercadopago-back-urls.ts';

test('only a payment for the exact preference reference and amount can approve a ticket', () => {
  const reference = 'nightguide:event:unique';
  const payments = [
    { id: '1', status: 'approved', external_reference: 'another-order', transaction_amount: 25 },
    { id: '2', status: 'approved', external_reference: reference, transaction_amount: 50 },
    { id: '3', status: 'pending', external_reference: reference, transaction_amount: 25 },
  ];
  assert.equal(selectCheckoutPayment(payments, reference, 25)?.id, '3');
  assert.equal(selectCheckoutPayment(payments, reference, 10), null);
  assert.equal(selectCheckoutPayment([...payments, { id: '4', status: 'approved', external_reference: reference, transaction_amount: 25 }], reference, 25)?.id, '4');
});

test('Mercado Pago receives three plain HTTPS back URLs even with malformed site configuration', () => {
  const origin = getCheckoutSiteOrigin('http://localhost:3000/path?x=1');
  assert.equal(origin, 'https://nightguide-modern.vercel.app');
  const urls = getCheckoutBackUrls(origin, 'sunset-beats');
  assert.deepEqual(Object.keys(urls).sort(), ['failure', 'pending', 'success']);
  for (const value of Object.values(urls)) {
    const url = new URL(value);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.search, '');
    assert.equal(url.hostname, 'nightguide-modern.vercel.app');
  }
  assert.notEqual(urls.success, urls.failure);
});
