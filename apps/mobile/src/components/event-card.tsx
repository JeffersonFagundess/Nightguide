import { router } from 'expo-router';
import { CalendarDays, Heart, MapPin } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';
import type { NightEvent } from '@/src/types';

type Props = {
  event: NightEvent;
  saved: boolean;
  onToggleSaved: () => void;
  featured?: boolean;
};

export function EventCard({ event, saved, onToggleSaved, featured = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${event.title}`}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.card, featured && styles.featured, pressed && styles.pressed]}>
      <Image source={{ uri: event.image }} style={[styles.image, featured && styles.imageFeatured]} />
      <View style={styles.overlay} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remover dos favoritos' : 'Salvar evento'}
        hitSlop={8}
        onPress={(pressEvent) => {
          pressEvent.stopPropagation();
          onToggleSaved();
        }}
        style={[styles.heart, saved && styles.heartSaved]}>
        <Heart size={19} color={saved ? colors.ink : colors.text} fill={saved ? colors.ink : 'transparent'} />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.badge}><Text style={styles.badgeText}>{event.genre}</Text></View>
        <Text style={[styles.title, featured && styles.titleFeatured]} numberOfLines={2}>{event.title}</Text>
        <View style={styles.metaRow}>
          <MapPin size={14} color={colors.muted} />
          <Text style={styles.meta} numberOfLines={1}>{event.venue}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            <CalendarDays size={14} color={colors.accent} />
            <Text style={styles.date}>{event.date} • {event.time}</Text>
          </View>
          <Text style={styles.price}>{event.price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 300, overflow: 'hidden', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  featured: { width: 300, minHeight: 390, marginRight: 14 },
  image: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  imageFeatured: { height: '100%' },
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5,5,7,0.35)' },
  heart: { position: 'absolute', top: 14, right: 14, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  heartSaved: { backgroundColor: colors.accent, borderColor: colors.accent },
  content: { marginTop: 'auto', padding: 18, gap: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(226,255,84,0.15)', borderColor: 'rgba(226,255,84,0.35)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { color: colors.accent, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  title: { color: colors.text, fontSize: 25, lineHeight: 29, fontWeight: '900', letterSpacing: -0.7 },
  titleFeatured: { fontSize: 31, lineHeight: 34 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 14, flexShrink: 1 },
  bottomRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  date: { color: colors.text, fontSize: 13, fontWeight: '700' },
  price: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
});
