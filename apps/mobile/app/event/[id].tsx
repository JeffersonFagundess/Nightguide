import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Heart, MapPin, Navigation, Share2, Sparkles, Ticket } from 'lucide-react-native';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/state';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { openExactDirections } from '@/src/lib/maps';
import { useUserData } from '@/src/providers/user-data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import { localizeEventText } from '@/src/lib/i18n';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEvent, venues } = useNightData();
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite } = useUserData();
  const { language } = usePreferences();
  const t = eventCopy[language];
  const event = getEvent(id);
  const venue = event ? venues.find((item) => item.id === event.venueId || item.name === event.venue) : undefined;

  if (!event) {
    return <Screen contentStyle={styles.missing}><EmptyState title={t.notFound} text={t.notFoundText} action={{ label: t.back, onPress: () => router.back() }} /></Screen>;
  }

  const saved = favoriteIds.includes(event.id);

  async function shareEvent() {
    await Share.share({
      title: event!.title,
      message: `${event!.title} — ${event!.date} ${language === 'pt' ? 'às' : 'at'} ${event!.time}, ${language === 'pt' ? 'em' : 'at'} ${event!.venue}. ${t.seeNightGuide}: nightguide://event/${event!.id}`,
    });
  }

  async function openRoute() {
    if (event?.latitude == null || event.longitude == null) return;
    await openExactDirections({ latitude: event.latitude, longitude: event.longitude });
  }

  function buy() {
    const next = `/checkout/${event!.id}`;
    if (!user) {
      router.push({ pathname: '/auth/login', params: { next } });
      return;
    }
    router.push({ pathname: '/checkout/[eventId]', params: { eventId: event!.id } });
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: event.image }} style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />
        <View style={styles.heroActions}>
          <Pressable onPress={() => void toggleFavorite(event)} style={[styles.iconButton, saved && styles.saved]} accessibilityLabel={t.save}>
            <Heart size={21} color={saved ? colors.ink : colors.text} fill={saved ? colors.ink : 'transparent'} />
          </Pressable>
          <Pressable onPress={() => void shareEvent()} style={styles.iconButton} accessibilityLabel={t.share}><Share2 size={21} color={colors.text} /></Pressable>
        </View>
        <View style={styles.heroCopy}>
          <View style={styles.badge}><Text style={styles.badgeText}>{localizeEventText(event.genre, language)}</Text></View>
          <Text style={styles.title}>{event.title}</Text>
          <Pressable
            accessibilityRole={venue ? 'button' : undefined}
            disabled={!venue}
            onPress={() => venue && router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}
            style={styles.venueRow}>
            <MapPin size={16} color={colors.accent} /><Text style={styles.venue}>{event.venue}{venue ? ` • ${t.viewProfile}` : ''}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <Info icon={CalendarDays} label={t.when} value={`${localizeEventText(event.date, language)}\n${event.time}`} />
        <Info icon={Ticket} label={t.entry} value={localizeEventText(event.price, language)} />
        <Info icon={Sparkles} label={t.mood} value={localizeEventText(event.mood, language)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.about}</Text>
        <Text style={styles.description}>{event.highlight}</Text>
      </View>

      {event.latitude != null && event.longitude != null ? <Button label={t.directions} icon={Navigation} variant="secondary" onPress={() => void openRoute()} /> : null}
      <Button label={event.price.toLowerCase().includes('grátis') ? t.freeTicket : `${t.buy} • ${localizeEventText(event.price, language)}`} icon={Ticket} onPress={buy} style={styles.buyButton} />
    </Screen>
  );
}

const eventCopy = {
  pt: { notFound: 'Evento não encontrado', notFoundText: 'Ele pode ter sido removido ou ainda não está disponível offline.', back: 'Voltar', seeNightGuide: 'Veja no NightGuide', save: 'Salvar evento', share: 'Compartilhar evento', viewProfile: 'ver perfil', when: 'QUANDO', entry: 'ENTRADA', mood: 'CLIMA', about: 'Sobre o evento', directions: 'Como chegar ao ponto exato', freeTicket: 'Gerar ingresso grátis', buy: 'Comprar' },
  en: { notFound: 'Event not found', notFoundText: 'It may have been removed or may not be available offline yet.', back: 'Back', seeNightGuide: 'View on NightGuide', save: 'Save event', share: 'Share event', viewProfile: 'view profile', when: 'WHEN', entry: 'ENTRY', mood: 'MOOD', about: 'About the event', directions: 'Directions to exact point', freeTicket: 'Get free ticket', buy: 'Buy' },
} as const;

function Info({ icon: Icon, label, value }: { icon: typeof Ticket; label: string; value: string }) {
  return <View style={styles.info}><Icon size={18} color={colors.accent} /><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0 },
  missing: { justifyContent: 'center' },
  hero: { height: 430, justifyContent: 'flex-end', overflow: 'hidden' },
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(7,7,9,0.42)' },
  heroActions: { position: 'absolute', top: 18, right: 18, flexDirection: 'row', gap: 9 },
  iconButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  saved: { backgroundColor: colors.accent, borderColor: colors.accent },
  heroCopy: { paddingHorizontal: 20, paddingBottom: 24 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accent },
  badgeText: { color: colors.ink, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 40, lineHeight: 43, fontWeight: '900', letterSpacing: -1.3, marginTop: 12 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  venue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 9, paddingHorizontal: 18, marginTop: 18 },
  info: { flex: 1, minHeight: 120, padding: 13, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 12 },
  infoValue: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 5 },
  section: { paddingHorizontal: 18, marginVertical: 25 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 9 },
  buyButton: { marginTop: 11, marginHorizontal: 18 },
});
