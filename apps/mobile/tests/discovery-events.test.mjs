import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseDiscoveryEvents } from '../src/lib/discovery-events.ts';

test('mantém eventos de demonstração ao lado dos publicados, sem duplicar IDs', () => {
  const live = [{ id: 'real' }];
  const demo = [{ id: 'demo' }];
  assert.deepEqual(chooseDiscoveryEvents(live, demo), { events: [...live, ...demo], demoMode: false });
  assert.deepEqual(chooseDiscoveryEvents([], demo), { events: demo, demoMode: true });
  assert.deepEqual(chooseDiscoveryEvents([{ id: 'demo' }], demo), { events: [{ id: 'demo' }], demoMode: false });
});
