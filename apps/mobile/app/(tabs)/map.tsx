import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Screen } from '@/src/components/screen';
import { Button } from '@/src/components/button';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { openExactDirections, openExactLocation } from '@/src/lib/maps';
import { colors } from '@/src/theme';
import { localizeVenueCategory, localizeVenueDescription } from '@/src/lib/i18n';

export default function MapScreen() {
  const params = useLocalSearchParams<{ venueId?: string }>();
  const { venues } = useNightData();
  const { language } = usePreferences();
  const pt = language === 'pt';
  const [selectedId, setSelectedId] = useState<string>();
  const [mapError, setMapError] = useState(false);
  const selected = venues.find(item => item.id === selectedId) || venues[0];
  const lat = selected?.latitude ?? -22.933;
  const lon = selected?.longitude ?? -42.496;
  const bbox = [lon - 0.0035, lat - 0.0025, lon + 0.0035, lat + 0.0025].join(',');
  const uri = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`;

  useEffect(() => {
    const requestedVenueId = Array.isArray(params.venueId) ? params.venueId[0] : params.venueId;
    if (requestedVenueId && venues.some(venue => venue.id === requestedVenueId)) {
      setSelectedId(requestedVenueId);
      setMapError(false);
    }
  }, [params.venueId, venues]);

  async function route() {
    try { await openExactDirections({ latitude: lat, longitude: lon, label: selected?.name, address: selected?.address }); }
    catch { Alert.alert(pt ? 'Não foi possível abrir a rota' : 'Unable to open directions'); }
  }

  async function openPoint() {
    try { await openExactLocation({ latitude: lat, longitude: lon, label: selected?.name, address: selected?.address }); }
    catch { Alert.alert(pt ? 'Não foi possível abrir o ponto no mapa' : 'Unable to open the map location'); }
  }
  return <Screen>
    <Text style={styles.title}>{pt ? 'Mapa de Saquarema' : 'Saquarema map'}</Text>
    <Text style={styles.meta}>{pt ? 'Escolha um local para centralizar o mapa no endereço exato. Os endereços ficam salvos offline.' : 'Choose a venue to center the map on its exact address. Addresses remain available offline.'}</Text>
    <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingVertical: 16 }}>
      {venues.map(venue => <Pressable key={venue.id} style={[styles.chip, selected?.id === venue.id && styles.active]} onPress={() => { setSelectedId(venue.id); setMapError(false); }}>
        <Text style={styles.text}>{venue.name}</Text>
      </Pressable>)}
    </ScrollView>
    {selected ? <>
      <View style={styles.map}>
        {mapError ? <View style={{ padding: 20, gap: 15 }}><Text style={styles.text}>{pt ? 'Mapa indisponível. Consulte o endereço abaixo.' : 'Map unavailable. See the address below.'}</Text><Button label={pt ? 'Tentar novamente' : 'Retry'} onPress={() => setMapError(false)} /></View> :
          <WebView key={selected.id} source={{ uri }} style={{ flex: 1 }} onError={() => setMapError(true)} onHttpError={() => setMapError(true)} onRenderProcessGone={() => setMapError(true)}
            onShouldStartLoadWithRequest={request => request.url.startsWith('https://www.openstreetmap.org/') || request.url === 'about:blank'} />}
        {!mapError ? <View pointerEvents="none" style={styles.exactBadge}><Text style={styles.exactBadgeText}>{pt ? 'PONTO EXATO' : 'EXACT POINT'}</Text></View> : null}
      </View>
      <Text style={styles.title}>{selected.name}</Text>
      <Text style={styles.meta}>{localizeVenueCategory(selected.category, language)} · {selected.address}</Text>
      <Text style={[styles.text, { marginVertical: 14 }]}>{localizeVenueDescription(selected.vibe, selected.category, language)}</Text>
      <Button label={pt ? 'Ver perfil e avaliações' : 'Profile and reviews'} onPress={() => router.push({ pathname: '/venue/[id]', params: { id: selected.id } })} />
      <Button label={pt ? 'Abrir endereço exato no mapa' : 'Open exact address on map'} variant="secondary" onPress={() => void openPoint()} style={{ marginTop: 10 }} />
      <Button label={pt ? 'Traçar rota até o ponto exato' : 'Directions to exact point'} variant="secondary" onPress={() => void route()} style={{ marginTop: 10 }} />
      <Text style={styles.coordinate}>{pt ? 'Destino GPS' : 'GPS destination'}: {lat.toFixed(7)}, {lon.toFixed(7)}</Text>
    </> : <Text style={styles.text}>{pt ? 'Nenhum local disponível.' : 'No places available.'}</Text>}
  </Screen>;
}
const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginVertical: 14 },
  text: { color: colors.text, lineHeight: 22 }, meta: { color: colors.muted, lineHeight: 21 },
  chip: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  active: { borderColor: colors.accent },
  map: { height: 330, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.surface },
  exactBadge: { position: 'absolute', top: 10, left: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(9,9,11,0.82)', borderWidth: 1, borderColor: colors.accent },
  exactBadgeText: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  coordinate: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
