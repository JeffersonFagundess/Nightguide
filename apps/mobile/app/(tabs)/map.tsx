import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LocateFixed, Navigation, Star } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/button';
import { LanguageSwitch } from '@/src/components/language-switch';
import { useNightData } from '@/src/providers/data-provider';
import { colors } from '@/src/theme';
import type { Venue } from '@/src/types';

const saquaremaRegion: Region = {
  latitude: -22.932,
  longitude: -42.506,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

export default function MapScreen() {
  const { venues, events } = useNightData();
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Venue | null>(venues[0] ?? null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then(({ granted }) => setLocationGranted(granted));
  }, []);

  const selectedEvent = useMemo(() => events.find((event) => event.venueId === selected?.id || event.venue === selected?.name), [events, selected]);

  async function goToUser() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(permission.granted);
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    } finally {
      setLocating(false);
    }
  }

  async function openRoute(venue: Venue) {
    const destination = `${venue.latitude},${venue.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    await Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>EXPLORE POR PERTO</Text>
          <Text style={styles.title}>Mapa da noite</Text>
        </View>
        <View style={styles.headerActions}>
          <LanguageSwitch />
          <Pressable accessibilityRole="button" onPress={() => void goToUser()} style={styles.locateButton}>
            <LocateFixed color={colors.ink} size={21} />
          </Pressable>
        </View>
      </View>

      <View style={styles.mapShell}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={saquaremaRegion}
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
          userInterfaceStyle="dark">
          {venues.map((venue) => (
            <Marker
              key={venue.id}
              coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
              title={venue.name}
              description={venue.category}
              pinColor={selected?.id === venue.id ? colors.accent : colors.rose}
              onPress={() => setSelected(venue)}
            />
          ))}
        </MapView>
        {locating ? <View style={styles.locating}><Text style={styles.locatingText}>Localizando…</Text></View> : null}
      </View>

      {selected ? (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{selected.name}</Text>
              <Text style={styles.cardMeta}>{selected.category} • {selected.address}</Text>
            </View>
            <View style={styles.rating}><Star size={14} color={colors.accent} fill={colors.accent} /><Text style={styles.ratingText}>{selected.rating.toFixed(1)}</Text></View>
          </View>
          <Text style={styles.vibe}>{selected.vibe}</Text>
          <View style={styles.actions}>
            <Button label="Ver perfil" onPress={() => router.push({ pathname: '/venue/[id]', params: { id: selected.id } })} style={styles.action} />
            <Button label="Traçar rota" icon={Navigation} onPress={() => void openRoute(selected)} variant="secondary" style={styles.action} />
          </View>
          {selectedEvent ? <Button label="Ver evento deste local" onPress={() => router.push({ pathname: '/event/[id]', params: { id: selectedEvent.id } })} variant="ghost" style={styles.eventAction} /> : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontWeight: '900', fontSize: 10, letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  locateButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapShell: { flex: 1, overflow: 'hidden', marginHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  locating: { position: 'absolute', top: 14, alignSelf: 'center', backgroundColor: 'rgba(9,9,11,0.86)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  locatingText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  card: { margin: 12, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 20 },
  cardMeta: { color: colors.muted, fontSize: 13, marginTop: 5, lineHeight: 18 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingText: { color: colors.text, fontWeight: '800' },
  vibe: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  action: { flex: 1, minHeight: 46 },
  eventAction: { minHeight: 42, marginTop: 4 },
});
