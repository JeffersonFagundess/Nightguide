import assert from 'node:assert/strict';
import test from 'node:test';

import { distanceFromUserKm, distanceKm, formatDistance, hasValidCoordinates } from '../src/lib/distance.ts';

test('calcula a distância geográfica para filtrar pelo raio', () => {
  const user = { latitude: -22.9344, longitude: -42.4968 };
  const nearby = { latitude: -22.9296, longitude: -42.5103 };
  const distant = { latitude: -22.9344, longitude: -43.4968 };

  assert.equal(distanceKm(user, user), 0);
  assert.ok(distanceKm(user, nearby) > 1 && distanceKm(user, nearby) < 2);
  assert.ok(distanceKm(user, nearby) <= 2);
  assert.ok(distanceKm(user, distant) > 100);
});

test('não inventa distância se GPS ou coordenadas do evento faltarem', () => {
  const event = { latitude: -22.9344, longitude: -42.4968 };
  assert.equal(distanceFromUserKm(null, event), null);
  assert.equal(distanceFromUserKm(event, { latitude: undefined, longitude: undefined }), null);
  assert.equal(hasValidCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 181 }), false);
});

test('mostra metros para eventos próximos e quilômetros para distâncias maiores', () => {
  assert.equal(formatDistance(0.65, 'pt'), '650 m');
  assert.equal(formatDistance(1.85, 'pt'), '1,9 km');
  assert.equal(formatDistance(1.85, 'en'), '1.9 km');
});
