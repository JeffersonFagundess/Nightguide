import type { Language } from '@/src/providers/preferences-provider';

const englishTerms: Array<[RegExp, string]> = [
  [/Restaurante/gi, 'Restaurant'],
  [/frutos do mar/gi, 'seafood'],
  [/Bistrô/gi, 'Bistro'],
  [/Quiosque/gi, 'Kiosk'],
  [/Padaria/gi, 'Bakery'],
  [/Café/gi, 'Cafe'],
  [/Pizzaria/gi, 'Pizzeria'],
  [/Sorveteria/gi, 'Ice cream shop'],
  [/Praia/gi, 'Beach'],
  [/passeio/gi, 'sightseeing'],
  [/surfe/gi, 'surfing'],
  [/natureza/gi, 'nature'],
  [/orla/gi, 'waterfront'],
  [/Bar e evento/gi, 'Bar and events'],
];

export function localizeVenueCategory(value: string, language: Language) {
  if (language === 'pt') return value;
  return englishTerms.reduce((result, [term, replacement]) => result.replace(term, replacement), value);
}

export function localizeVenueDescription(value: string, category: string, language: Language) {
  if (language === 'pt') return value;
  if (value.includes('Consulte o local para confirmar')) {
    return `${localizeVenueCategory(category, language)} in Saquarema. Contact the venue to confirm hours, prices and availability.`;
  }
  return value;
}

export function localizeEventText(value: string, language: Language) {
  if (language === 'pt') return value;
  const exact: Record<string, string> = {
    'Sexta': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday', 'Quinta': 'Thursday', 'Terça': 'Tuesday',
    'Grátis': 'Free', 'House e brasilidades': 'House & Brazilian beats', 'Samba e pagode': 'Samba & pagode',
    'Forró e xote': 'Forró & xote', 'Rock ao vivo': 'Live rock', 'Energia alta': 'High energy',
    'Roda cheia': 'Packed samba circle', 'Leve e social': 'Easygoing & social', 'Dançante': 'Dance-ready',
    'Ao vivo': 'Live', 'Leve': 'Easygoing',
  };
  return exact[value] || value;
}
