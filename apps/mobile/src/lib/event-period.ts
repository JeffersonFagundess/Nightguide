export type EventPeriod = 'all' | 'today' | 'week';

export function isEventInPeriod(startsAt: string | undefined, period: EventPeriod, now = new Date()): boolean {
  if (period === 'all') return true;
  if (!startsAt) return false;
  const eventTime = new Date(startsAt).getTime();
  if (!Number.isFinite(eventTime) || eventTime < now.getTime()) return false;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (period === 'today' ? 1 : 7));
  return eventTime < end.getTime();
}

export function nextDemoOccurrence(weekday: number, time: string, now = new Date()): string {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  next.setDate(next.getDate() + (weekday - next.getDay() + 7) % 7);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);
  return next.toISOString();
}
