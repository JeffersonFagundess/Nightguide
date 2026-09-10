import { Search, SlidersHorizontal } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CommunityFeed } from '@/src/components/community-feed';

import { Brand } from '@/src/components/brand';
import { EventCard } from '@/src/components/event-card';
import { LanguageSwitch } from '@/src/components/language-switch';
import { EmptyState } from '@/src/components/state';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';
import type { NightEvent } from '@/src/types';

const filters = ['Tudo', 'Grátis', 'Ao vivo', 'Praia', 'Perto'] as const;
type Filter = (typeof filters)[number];

export default function DiscoveryScreen() {
  const { events, venues, refresh, refreshing, source } = useNightData();
  const { favoriteIds, toggleFavorite } = useUserData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Tudo');
  const { language } = usePreferences();
  const t = copy[language];

  const visible = useMemo(() => {
    const term = normalize(query);
    return events.filter((event) => {
      const searchable = normalize(`${event.title} ${event.venue} ${event.genre} ${event.highlight} ${event.mood}`);
      return (!term || searchable.includes(term)) && matchesFilter(event, filter);
    });
  }, [events, filter, query]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Brand />
          <LanguageSwitch />
        </View>

        <Text style={styles.eyebrow}>{t.eyebrow}</Text>
        <Text style={styles.hero}>{t.hero}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={styles.searchBox}>
          <Search size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search}
            placeholderTextColor={colors.muted}
            selectionColor={colors.accent}
            returnKeyType="search"
            style={styles.searchInput}
          />
          <SlidersHorizontal size={19} color={colors.accent} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => (
            <Text key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>{item}</Text>
          ))}
        </ScrollView>

        {!query && filter === 'Tudo' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.featured}</Text>
              <Text style={styles.source}>{source === 'supabase' ? 'AO VIVO' : source === 'cache' ? 'OFFLINE' : 'DEMO'}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
              {events.slice(0, 4).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  featured
                  saved={favoriteIds.includes(event.id)}
                  onToggleSaved={() => void toggleFavorite(event)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{language === 'pt' ? 'Explore Saquarema' : 'Explore Saquarema'}</Text></View>
        <View style={styles.eventList}>
          {venues.filter(venue => !query || normalize(`${venue.name} ${venue.category} ${venue.address}`).includes(normalize(query))).map(venue => (
            <Pressable key={venue.id} style={styles.venueCard} accessibilityRole="button"
              onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}>
              {venue.coverUrl ? <Image source={{ uri: venue.coverUrl }} style={styles.venueImage} /> : <Text style={styles.venueIcon}>📍</Text>}
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <Text style={styles.subtitleSmall}>{venue.photoIllustrative ? 'Imagem ilustrativa' : venue.photoCredit}</Text>
                <Text style={styles.subtitleSmall}>{venue.category} · {venue.address}</Text>
                <Text style={styles.source}>{language === 'pt' ? 'VER PERFIL E AVALIAÇÕES →' : 'PROFILE AND REVIEWS →'}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <CommunityFeed />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{query || filter !== 'Tudo' ? t.results : t.upcoming}</Text>
          <Text style={styles.count}>{visible.length}</Text>
        </View>
        <View style={styles.eventList}>
          {visible.length ? visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              saved={favoriteIds.includes(event.id)}
              onToggleSaved={() => void toggleFavorite(event)}
            />
          )) : (
            <EmptyState title={t.emptyTitle} text={t.emptyText} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const copy = {
  pt: {
    eyebrow: 'SUA NOITE COMEÇA AQUI',
    hero: 'Descubra o que está acontecendo agora.',
    subtitle: 'Eventos, música e lugares que combinam com a sua vibe.',
    search: 'Buscar evento, local ou estilo',
    featured: 'Em destaque',
    results: 'Resultados',
    upcoming: 'Próximos eventos',
    emptyTitle: 'Nada por aqui',
    emptyText: 'Tente outro termo ou remova um dos filtros.',
  },
  en: {
    eyebrow: 'YOUR NIGHT STARTS HERE',
    hero: "Discover what's happening right now.",
    subtitle: 'Events, music and places that match your vibe.',
    search: 'Search event, venue or music style',
    featured: 'Featured',
    results: 'Results',
    upcoming: 'Upcoming events',
    emptyTitle: 'Nothing here yet',
    emptyText: 'Try another search or remove a filter.',
  },
} as const;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function matchesFilter(event: NightEvent, filter: Filter) {
  const text = normalize(`${event.genre} ${event.mood} ${event.venue} ${event.highlight}`);
  if (filter === 'Grátis') return normalize(event.price).includes('gratis');
  if (filter === 'Ao vivo') return text.includes('ao vivo') || text.includes('samba') || text.includes('rock');
  if (filter === 'Praia') return text.includes('praia') || text.includes('orla') || text.includes('mar');
  if (filter === 'Perto') return /m$/.test(event.distance.trim()) || Number(event.distance.replace(/[^\d,]/g, '').replace(',', '.')) <= 2;
  return true;
}

const styles = StyleSheet.create({
  venueCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  venueImage: { width: 85, height: 90, borderRadius: 12 },
  venueIcon: { fontSize: 30, width: 45, textAlign: 'center' },
  venueName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  subtitleSmall: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingBottom: 34 },
  topbar: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginTop: 38, paddingHorizontal: 18 },
  hero: { color: colors.text, fontSize: 39, lineHeight: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: 10, paddingHorizontal: 18 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 13, paddingHorizontal: 18, maxWidth: 380 },
  searchBox: { minHeight: 54, marginHorizontal: 18, marginTop: 26, paddingHorizontal: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, height: 52 },
  filters: { paddingHorizontal: 18, paddingVertical: 16, gap: 9 },
  filter: { overflow: 'hidden', color: colors.muted, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, fontSize: 13, fontWeight: '800' },
  filterActive: { color: colors.ink, backgroundColor: colors.accent, borderColor: colors.accent },
  sectionHeader: { marginTop: 18, marginBottom: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  source: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  count: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  featuredList: { paddingLeft: 18, paddingRight: 4 },
  eventList: { paddingHorizontal: 18, gap: 14 },
});
