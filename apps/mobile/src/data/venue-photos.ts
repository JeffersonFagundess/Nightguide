const commons = 'https://commons.wikimedia.org/wiki/File:';
const real: Record<string, { url: string; credit: string; source: string }> = {
  'Praia da Vila': { url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Praia_da_Vila_-_Saquarema_-_RJ.jpg', credit: 'Carlos Eduardo Freixo · 2007 · CC BY-SA 3.0', source: commons + 'Praia_da_Vila_-_Saquarema_-_RJ.jpg' },
  'Praia de Itaúna': { url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Saquarema%2C_vista_para_praia_de_Ita%C3%BAna_-_panoramio.jpg', credit: 'coiote022 · 2009 · CC BY-SA 3.0', source: commons + 'Saquarema,_vista_para_praia_de_Ita%C3%BAna_-_panoramio.jpg' },
  'Praia de Jaconé': { url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Praia_de_Jacon%C3%A9_Saquarema_RJ_-_panoramio.jpg', credit: 'Renankraw · 2012 · CC BY-SA 3.0', source: commons + 'Praia_de_Jacon%C3%A9_Saquarema_RJ_-_panoramio.jpg' },
};
export function venuePhoto(name: string, category: string) {
  if (real[name]) return { coverUrl: real[name].url, photoCredit: real[name].credit, photoSource: real[name].source, photoIllustrative: false };
  const kind = category.toLowerCase();
  const photo = kind.includes('pizzaria') ? 'photo-1513104890138-7c749659a591'
    : kind.includes('café') || kind.includes('padaria') ? 'photo-1501339847302-ac426a4a7cbb'
    : kind.includes('sorveteria') ? 'photo-1563805042-7684c019e1cb'
    : kind.includes('bar') ? 'photo-1514933651103-005eec06c04b' : 'photo-1517248135467-4c7edcad34c4';
  return { coverUrl: `https://images.unsplash.com/${photo}?w=800&q=80`, photoCredit: 'Imagem ilustrativa · Unsplash', photoSource: 'https://unsplash.com/license', photoIllustrative: true };
}
