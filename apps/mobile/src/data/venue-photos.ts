const commons = 'https://commons.wikimedia.org/wiki/File:';
const assets = {
  restaurant: require('../../assets/venues/restaurante.jpg'),
  bar: require('../../assets/venues/bar-bistro.jpg'),
  cafe: require('../../assets/venues/cafe-padaria.jpg'),
  pizza: require('../../assets/venues/pizzaria.jpg'),
  iceCream: require('../../assets/venues/sorveteria.jpg'),
  villageBeach: require('../../assets/venues/praia-da-vila.jpg'),
  itaunaBeach: require('../../assets/venues/praia-de-itauna.jpg'),
  jaconeBeach: require('../../assets/venues/praia-de-jacone.jpg'),
} as const;

const real: Record<string, { coverAsset: number; credit: string; source: string }> = {
  'Praia da Vila': { coverAsset: assets.villageBeach, credit: 'Carlos Eduardo Freixo · 2007 · CC BY-SA 3.0', source: commons + 'Praia_da_Vila_-_Saquarema_-_RJ.jpg' },
  'Praia de Itaúna': { coverAsset: assets.itaunaBeach, credit: 'coiote022 · 2009 · CC BY-SA 3.0', source: commons + 'Saquarema,_vista_para_praia_de_Ita%C3%BAna_-_panoramio.jpg' },
  'Praia de Jaconé': { coverAsset: assets.jaconeBeach, credit: 'Renankraw · 2012 · CC BY-SA 3.0', source: commons + 'Praia_de_Jacon%C3%A9_Saquarema_RJ_-_panoramio.jpg' },
};

export function venuePhoto(name: string, category: string) {
  if (real[name]) return { coverAsset: real[name].coverAsset, photoCredit: real[name].credit, photoSource: real[name].source, photoIllustrative: false };
  const kind = category.toLowerCase();
  const coverAsset = kind.includes('pizzaria') ? assets.pizza
    : kind.includes('café') || kind.includes('padaria') ? assets.cafe
    : kind.includes('sorveteria') ? assets.iceCream
    : kind.includes('bar') || kind.includes('bistrô') ? assets.bar : assets.restaurant;
  return { coverAsset, photoCredit: 'Imagem ilustrativa · Unsplash', photoSource: 'https://unsplash.com/license', photoIllustrative: true };
}
