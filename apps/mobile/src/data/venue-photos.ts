import type { Venue } from '@/src/types';

type VenuePhoto = Pick<Venue, 'coverAsset' | 'galleryAssets' | 'photoCredit' | 'photoSource' | 'photoIllustrative'> & {
  coverAsset: number;
};

const genericAssets = {
  restaurant: require('../../assets/venues/restaurante.jpg'),
  bar: require('../../assets/venues/bar-bistro.jpg'),
  cafe: require('../../assets/venues/cafe-padaria.jpg'),
  pizza: require('../../assets/venues/pizzaria.jpg'),
  iceCream: require('../../assets/venues/sorveteria.jpg'),
} as const;

const projectPhotos: Record<string, { coverAsset: number; galleryAssets: number[] }> = {
  'Restaurante Marisco': {
    coverAsset: require('../../assets/venues/restaurante-marisco-cover.jpg'),
    galleryAssets: [require('../../assets/venues/restaurante-marisco-post.jpg')],
  },
  'Latitude Bistrô': {
    coverAsset: require('../../assets/venues/latitude-bistro-cover.jpg'),
    galleryAssets: [require('../../assets/venues/latitude-bistro-post.jpg')],
  },
  'Quiosque 12': {
    coverAsset: require('../../assets/venues/quiosque-12-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/quiosque-12-post.jpg'),
      require('../../assets/venues/quiosque-12-gallery-01.webp'),
    ],
  },
  'Esquina da Praia': {
    coverAsset: require('../../assets/venues/esquina-da-praia-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/esquina-da-praia-post.jpg'),
      require('../../assets/venues/esquina-da-praia-gallery-01.jpg'),
      require('../../assets/venues/esquina-da-praia-gallery-02.jpg'),
    ],
  },
  'Villa Bistrô': {
    coverAsset: require('../../assets/venues/villa-bistro-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/villa-bistro-post.jpg'),
      require('../../assets/venues/villa-bistro-gallery-01.jpg'),
    ],
  },
  'Casa da Mah': {
    coverAsset: require('../../assets/venues/casa-da-mah-cover.jpg'),
    galleryAssets: [require('../../assets/venues/casa-da-mah-post.jpg')],
  },
  'Padaria do Nei na Raia': {
    coverAsset: require('../../assets/venues/padaria-do-nei-cover.webp'),
    galleryAssets: [
      require('../../assets/venues/padaria-do-nei-post.jpg'),
      require('../../assets/venues/padaria-do-nei-gallery-01.jpg'),
    ],
  },
  'Shilo Pizzaria': {
    coverAsset: require('../../assets/venues/shilo-pizzaria-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/shilo-pizzaria-post.jpg'),
      require('../../assets/venues/shilo-pizzaria-gallery-01.jpg'),
      require('../../assets/venues/shilo-pizzaria-gallery-02.jpg'),
      require('../../assets/venues/shilo-pizzaria-gallery-03.jpg'),
      require('../../assets/venues/shilo-pizzaria-gallery-04.jpg'),
    ],
  },
  'Restaurante Belar': {
    coverAsset: require('../../assets/venues/restaurante-belar-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/restaurante-belar-post.jpg'),
      require('../../assets/venues/restaurante-belar-gallery-01.jpg'),
      require('../../assets/venues/restaurante-belar-gallery-02.jpg'),
    ],
  },
  'Eskimó': {
    coverAsset: require('../../assets/venues/eskimo-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/eskimo-post.webp'),
      require('../../assets/venues/eskimo-gallery-01.jpg'),
      require('../../assets/venues/eskimo-gallery-02.jpg'),
      require('../../assets/venues/eskimo-gallery-03.jpg'),
      require('../../assets/venues/eskimo-gallery-04.jpg'),
      require('../../assets/venues/eskimo-gallery-05.jpg'),
      require('../../assets/venues/eskimo-gallery-06.jpg'),
      require('../../assets/venues/eskimo-gallery-07.jpg'),
      require('../../assets/venues/eskimo-gallery-08.jpg'),
    ],
  },
  'Pizzaria do Rico': {
    coverAsset: require('../../assets/venues/pizzaria-do-rico-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/pizzaria-do-rico-post.jpg'),
      require('../../assets/venues/pizzaria-do-rico-gallery-01.jpg'),
      require('../../assets/venues/pizzaria-do-rico-gallery-02.jpg'),
      require('../../assets/venues/pizzaria-do-rico-gallery-03.jpg'),
      require('../../assets/venues/pizzaria-do-rico-gallery-04.jpg'),
      require('../../assets/venues/pizzaria-do-rico-gallery-05.jpg'),
      require('../../assets/venues/pizzaria-do-rico-gallery-06.jpg'),
    ],
  },
  P22: {
    coverAsset: require('../../assets/venues/p22-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/p22-post.jpg'),
      require('../../assets/venues/p22-gallery-01.jpg'),
      require('../../assets/venues/p22-gallery-02.jpg'),
      require('../../assets/venues/p22-gallery-03.jpg'),
      require('../../assets/venues/p22-gallery-04.jpg'),
      require('../../assets/venues/p22-gallery-05.jpg'),
    ],
  },
  Saquasuco: {
    coverAsset: require('../../assets/venues/saquasuco-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/saquasuco-post.jpg'),
      require('../../assets/venues/saquasuco-gallery-01.jpg'),
      require('../../assets/venues/saquasuco-gallery-02.jpg'),
      require('../../assets/venues/saquasuco-gallery-03.jpg'),
      require('../../assets/venues/saquasuco-gallery-04.jpg'),
    ],
  },
  'Praia da Vila': {
    coverAsset: require('../../assets/venues/praia-da-vila-real-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/praia-da-vila-real-post.jpg'),
      require('../../assets/venues/praia-da-vila-real-gallery-01.jpg'),
      require('../../assets/venues/praia-da-vila-real-gallery-02.jpg'),
      require('../../assets/venues/praia-da-vila-real-gallery-03.jpg'),
      require('../../assets/venues/praia-da-vila-real-gallery-04.jpg'),
    ],
  },
  'Praia de Itaúna': {
    coverAsset: require('../../assets/venues/praia-de-itauna-real-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/praia-de-itauna-real-post.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-01.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-02.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-03.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-04.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-05.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-06.jpg'),
      require('../../assets/venues/praia-de-itauna-real-gallery-07.png'),
      require('../../assets/venues/praia-de-itauna-real-gallery-08.png'),
      require('../../assets/venues/praia-de-itauna-real-gallery-09.webp'),
    ],
  },
  'Praia de Jaconé': {
    coverAsset: require('../../assets/venues/praia-de-jacone-real-cover.jpg'),
    galleryAssets: [
      require('../../assets/venues/praia-de-jacone-real-post.jpg'),
      require('../../assets/venues/praia-de-jacone-real-gallery-01.jpg'),
      require('../../assets/venues/praia-de-jacone-real-gallery-02.jpg'),
      require('../../assets/venues/praia-de-jacone-real-gallery-03.jpg'),
    ],
  },
};

export function venuePhoto(name: string, category: string): VenuePhoto {
  const projectPhoto = projectPhotos[name];
  if (projectPhoto) {
    return {
      ...projectPhoto,
      photoCredit: 'Foto real fornecida pelo projeto',
      photoIllustrative: false,
    };
  }

  const kind = category.toLowerCase();
  const coverAsset = kind.includes('pizzaria') ? genericAssets.pizza
    : kind.includes('café') || kind.includes('padaria') ? genericAssets.cafe
    : kind.includes('sorveteria') ? genericAssets.iceCream
    : kind.includes('bar') || kind.includes('bistrô') ? genericAssets.bar
    : genericAssets.restaurant;

  return {
    coverAsset,
    galleryAssets: [],
    photoCredit: 'Imagem ilustrativa · Unsplash',
    photoSource: 'https://unsplash.com/license',
    photoIllustrative: true,
  };
}
