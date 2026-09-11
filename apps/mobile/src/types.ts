export type UserRole = 'admin' | 'owner' | 'customer' | 'promoter';

export type NightEvent = {
  id: string;
  venueId?: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  startsAt?: string;
  genre: string;
  price: string;
  image: string;
  highlight: string;
  mood: string;
  distance: string;
  latitude?: number;
  longitude?: number;
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
  coverUrl?: string;
  coverAsset?: number;
  galleryAssets?: number[];
  photoCredit?: string;
  photoSource?: string;
  photoIllustrative?: boolean;
};

export type Profile = {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
};

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  date: string;
  time: string;
  quantity: number;
  totalAmount: number;
  paymentLabel: string;
  status: 'approved' | 'cancelled';
  createdAt: string;
  buyerEmail: string;
  provider: 'mercadopago' | 'demo' | 'free';
  providerPaymentId?: string;
};

export type Review = {
  id: string;
  userId?: string;
  venueId: string;
  venue: string;
  rating: number;
  comment: string;
  createdAt: string;
  photoUri?: string;
  photoUrl?: string;
  photoAsset?: number;
  photoMimeType?: string;
  photoFileName?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  isDemo?: boolean;
};

export type OfflineActionType =
  | 'favorite_added'
  | 'favorite_removed'
  | 'review_created'
  | 'ticket_purchased'
  | 'ticket_cancelled';

export type OfflineAction = {
  id: string;
  type: OfflineActionType;
  userId?: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};
