export function chooseDiscoveryEvents<T extends { id: string }>(published: T[], demo: T[]): { events: T[]; demoMode: boolean } {
  const publishedIds = new Set(published.map(event => event.id));
  return {
    events: [...published, ...demo.filter(event => !publishedIds.has(event.id))],
    demoMode: published.length === 0,
  };
}
