import type { Review } from '@/src/types';
import realVenues from './real-venues.json';
import { venuePhoto } from './venue-photos';

/**
 * Read-only examples keep a fresh install useful before the first real review
 * exists in Supabase. They are intentionally labelled as examples in the UI.
 */
const examples: Record<string, Review[]> = {
  'Quiosque Maralto': [
    {
      id: 'demo-review-maralto-1',
      userId: 'demo-user-maralto',
      venueId: 'a1000000-0000-4000-8000-000000000001',
      venue: 'Quiosque Maralto',
      rating: 5,
      comment: 'Pôr do sol lindo, música boa e atendimento rápido. Ótimo para começar a noite.',
      createdAt: '2026-08-30T19:10:00.000Z',
      authorName: 'Camila (exemplo)',
      isDemo: true,
    },
  ],
  'Vila Gastrobar': [
    {
      id: 'demo-review-vila-1',
      userId: 'demo-user-vila',
      venueId: 'a1000000-0000-4000-8000-000000000002',
      venue: 'Vila Gastrobar',
      rating: 4,
      comment: 'O samba de sábado estava animado e os drinks autorais valeram a visita.',
      createdAt: '2026-08-29T23:20:00.000Z',
      authorName: 'Rafael (exemplo)',
      isDemo: true,
    },
  ],
  'Lagoa Lounge': [
    {
      id: 'demo-review-lagoa-1',
      userId: 'demo-user-lagoa',
      venueId: 'a1000000-0000-4000-8000-000000000003',
      venue: 'Lagoa Lounge',
      rating: 5,
      comment: 'Ambiente tranquilo, vista bonita para a lagoa e karaokê bem divertido.',
      createdAt: '2026-08-28T22:05:00.000Z',
      authorName: 'Bia (exemplo)',
      isDemo: true,
    },
  ],
  'Deck Itaúna': [
    {
      id: 'demo-review-deck-1',
      userId: 'demo-user-deck',
      venueId: 'a1000000-0000-4000-8000-000000000004',
      venue: 'Deck Itaúna',
      rating: 4,
      comment: 'Pista aberta e clima de praia. Chegue cedo para pegar uma mesa.',
      createdAt: '2026-08-27T21:45:00.000Z',
      authorName: 'João (exemplo)',
      isDemo: true,
    },
  ],
  'Wave Club': [
    {
      id: 'demo-review-wave-1',
      userId: 'demo-user-wave',
      venueId: 'a1000000-0000-4000-8000-000000000005',
      venue: 'Wave Club',
      rating: 4,
      comment: 'Som forte e pista cheia até tarde. A programação eletrônica é boa.',
      createdAt: '2026-08-26T23:30:00.000Z',
      authorName: 'Luiza (exemplo)',
      isDemo: true,
    },
  ],
};

export function getDemoReviews(venueName: string | undefined): Review[] {
  const venue = realVenues.find(item => item.name === venueName);
  if (venue) {
    const photos = venuePhoto(venue.name, venue.category);
    const postPhotos = photos.galleryAssets?.length ? photos.galleryAssets : [photos.coverAsset];
    return [0, 1].map(index => ({
    id: `demo-${venue.id}-${index}`, userId: `demo-visitor-${index}`, venueId: venue.id, venue: venue.name,
    rating: index === 0 ? 5 : 4, createdAt: '2026-09-10T12:00:00.000Z',
    authorName: index === 0 ? 'Camila (personagem de exemplo)' : 'Rafael (personagem de exemplo)',
    comment: index === 0 ? 'Exemplo de publicação: aqui você pode contar como foi seu passeio, avaliar e compartilhar uma foto.' : 'Exemplo de avaliação: seu comentário pode ser salvo offline e enviado quando a conexão voltar.',
    photoAsset: postPhotos[index % postPhotos.length],
    isDemo: true,
    }));
  }
  return venueName ? (examples[venueName] || []).map((review) => ({ ...review })) : [];
}
