import { Linking, Platform } from 'react-native';

type Destination = {
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
};

/** Opens turn-by-turn directions using the selected venue's exact stored coordinates. */
export async function openExactDirections({ latitude, longitude }: Destination) {
  const coordinates = `${latitude.toFixed(7)},${longitude.toFixed(7)}`;
  const browserFallback = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}&travelmode=driving&dir_action=navigate`;

  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`google.navigation:q=${coordinates}&mode=d`);
      return;
    } catch {
      // Google Maps may not be installed, so keep a browser-compatible fallback.
    }
  }

  await Linking.openURL(browserFallback);
}

/** Opens a labelled marker at the exact stored point instead of a broad address search. */
export async function openExactLocation({ latitude, longitude, label, address }: Destination) {
  const coordinates = `${latitude.toFixed(7)},${longitude.toFixed(7)}`;
  const description = [label, address, 'Saquarema - RJ'].filter(Boolean).join(' · ');
  const browserFallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;

  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`geo:${coordinates}?q=${encodeURIComponent(`${coordinates} (${description})`)}`);
      return;
    } catch {
      // Keep a browser-compatible exact-coordinate fallback.
    }
  }

  await Linking.openURL(browserFallback);
}
