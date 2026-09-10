import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Screen } from '@/src/components/screen';
import { Button } from '@/src/components/button';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { openExactDirections } from '@/src/lib/maps';
import { colors } from '@/src/theme';
import { localizeVenueCategory, localizeVenueDescription } from '@/src/lib/i18n';

export default function MapScreen() {
  const { venues } = useNightData();
  const { language } = usePreferences();
  const pt = language === 'pt';
  const [selectedId, setSelectedId] = useState<string>();
  const [mapError, setMapError] = useState(false);
  const selected = venues.find(item => item.id === selectedId) || venues[0];
  const lat = selected?.latitude ?? -22.933;
  const lon = selected?.longitude ?? -42.496;
  const bbox = [lon - 0.012, lat - 0.009, lon + 0.012, lat + 0.009].join(',');
  const uri = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`;
  async function route() {
    try { await openExactDirections({ latitude: lat, longitude: lon }); }
    catch { Alert.alert(pt ? 'Não foi possível abrir a rota' : 'Unable to open directions'); }
  }
  return <Screen>
    <Text style={styles.title}>{pt ? 'Mapa de Saquarema' : 'Saquarema map'}</Text>
    <Text style={styles.meta}>{pt ? 'Escolha um local. Os endereços salvos continuam disponíveis offline; o mapa de ruas precisa de internet.' : 'Choose a place. Saved addresses work offline; street maps need internet.'}</Text>
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
      </View>
      <Text style={styles.title}>{selected.name}</Text>
      <Text style={styles.meta}>{localizeVenueCategory(selected.category, language)} · {selected.address}</Text>
      <Text style={[styles.text, { marginVertical: 14 }]}>{localizeVenueDescription(selected.vibe, selected.category, language)}</Text>
      <Button label={pt ? 'Ver perfil e avaliações' : 'Profile and reviews'} onPress={() => router.push({ pathname: '/venue/[id]', params: { id: selected.id } })} />
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
  coordinate: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
