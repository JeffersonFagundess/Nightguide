export type CommunityReview = {
  id: string;
  user_id?: string;
  rating: number;
  comment: string;
  image_url?: string | null;
  image_data_url?: string | null;
  author_name: string;
  author_avatar_url?: string | null;
  created_at: string;
  is_demo?: boolean;
};

const examples: Record<string, CommunityReview[]> = {
  "Quiosque Maralto": [
    {
      id: "demo-review-maralto-1",
      user_id: "demo-user-maralto",
      rating: 5,
      comment: "Pôr do sol lindo, música boa e atendimento rápido. Ótimo para começar a noite.",
      author_name: "Camila (exemplo)",
      created_at: "2026-08-30T19:10:00.000Z",
      is_demo: true,
    },
  ],
  "Vila Gastrobar": [
    {
      id: "demo-review-vila-1",
      user_id: "demo-user-vila",
      rating: 4,
      comment: "O samba de sábado estava animado e os drinks autorais valeram a visita.",
      author_name: "Rafael (exemplo)",
      created_at: "2026-08-29T23:20:00.000Z",
      is_demo: true,
    },
  ],
  "Lagoa Lounge": [
    {
      id: "demo-review-lagoa-1",
      user_id: "demo-user-lagoa",
      rating: 5,
      comment: "Ambiente tranquilo, vista bonita para a lagoa e karaokê bem divertido.",
      author_name: "Bia (exemplo)",
      created_at: "2026-08-28T22:05:00.000Z",
      is_demo: true,
    },
  ],
  "Deck Itaúna": [
    {
      id: "demo-review-deck-1",
      user_id: "demo-user-deck",
      rating: 4,
      comment: "Pista aberta e clima de praia. Chegue cedo para pegar uma mesa.",
      author_name: "João (exemplo)",
      created_at: "2026-08-27T21:45:00.000Z",
      is_demo: true,
    },
  ],
  "Wave Club": [
    {
      id: "demo-review-wave-1",
      user_id: "demo-user-wave",
      rating: 4,
      comment: "Som forte e pista cheia até tarde. A programação eletrônica é boa.",
      author_name: "Luiza (exemplo)",
      created_at: "2026-08-26T23:30:00.000Z",
      is_demo: true,
    },
  ],
};

export function getDemoReviews(venueName: string | undefined) {
  return venueName ? (examples[venueName] || []).map((review) => ({ ...review })) : [];
}

