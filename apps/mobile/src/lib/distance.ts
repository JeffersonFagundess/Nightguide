export type Coordinates = { latitude: number; longitude: number };
export const savedLocationKey = 'nightguide:discovery-location:v1';

export function hasValidCoordinates(value: Partial<Coordinates> | null | undefined): value is Coordinates {
  return value != null &&
    typeof value.latitude === 'number' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (to.latitude - from.latitude) * radians;
  const longitudeDelta = (to.longitude - from.longitude) * radians;
  const arc = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(Math.max(0, 1 - arc)));
}

export function distanceFromUserKm(user: Coordinates | null, target: Partial<Coordinates>): number | null {
  return hasValidCoordinates(user) && hasValidCoordinates(target) ? distanceKm(user, target) : null;
}

export function isWithinRadiusKm(distance: number | null, radius: number): boolean {
  return distance !== null && Number.isFinite(distance) && Number.isFinite(radius) && radius >= 0 && distance <= radius;
}

export function formatDistance(distance: number, language: 'pt' | 'en'): string {
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 })} km`;
}
