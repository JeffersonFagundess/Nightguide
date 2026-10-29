import assert from 'node:assert/strict';
import test from 'node:test';

import { isEventInPeriod, nextDemoOccurrence } from '../src/lib/event-period.ts';

test('Hoje inclui apenas eventos futuros do dia local', () => {
  const now = new Date(2026, 9, 29, 12, 0);
  assert.equal(isEventInPeriod(new Date(2026, 9, 29, 20, 0).toISOString(), 'today', now), true);
  assert.equal(isEventInPeriod(new Date(2026, 9, 29, 10, 0).toISOString(), 'today', now), false);
  assert.equal(isEventInPeriod(new Date(2026, 9, 30, 0, 0).toISOString(), 'today', now), false);
});

test('Próximos 7 dias inclui hoje e os seis dias seguintes', () => {
  const now = new Date(2026, 9, 29, 12, 0);
  assert.equal(isEventInPeriod(new Date(2026, 10, 4, 23, 59).toISOString(), 'week', now), true);
  assert.equal(isEventInPeriod(new Date(2026, 10, 5, 0, 0).toISOString(), 'week', now), false);
  assert.equal(isEventInPeriod(undefined, 'week', now), false);
});

test('evento demo agenda a próxima ocorrência do dia da semana', () => {
  const now = new Date(2026, 9, 29, 22, 0); // Quinta-feira
  const next = new Date(nextDemoOccurrence(4, '20:30', now));
  assert.equal(next.getDay(), 4);
  assert.ok(next.getTime() > now.getTime());
  assert.equal(next.getDate(), 5);
});
