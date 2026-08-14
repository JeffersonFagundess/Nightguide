export type FeaturedEvent = {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  genre: string;
  price: string;
  image: string;
  video?: string;
  highlight: string;
  mood: string;
  distance: string;
};

export type Venue = {
  id: string;
  name: string;
  category: string;
  rating: number;
  latitude: number;
  longitude: number;
  address: string;
  vibe: string;
};
