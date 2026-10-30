import { MapPin, Search, SlidersHorizontal } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CommunityFeed } from '@/src/components/community-feed';
import { DistanceSlider } from '@/src/components/distance-slider';
import { Brand } from '@/src/components/brand';
import { EventCard } from '@/src/components/event-card';
import { LanguageSwitch } from '@/src/components/language-switch';
import { ThemeSwitch } from '@/src/components/theme-switch';
import { EmptyState } from '@/src/components/state';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';
import type { NightEvent, Venue } from '@/src/types';
import { localizeVenueCategory } from '@/src/lib/i18n';
import { distanceFromUserKm, formatDistance, hasValidCoordinates, isWithinRadiusKm, savedLocationKey, type Coordinates } from '@/src/lib/distance';
import { isEventInPeriod, type EventPeriod } from '@/src/lib/event-period';

const filters = ['all', 'free', 'live', 'beach'] as const;
const periods: EventPeriod[] = ['all', 'today', 'week'];
type Filter = (typeof filters)[number];

export default function DiscoveryScreen() {
  const { events, venues, refresh, refreshing, source } = useNightData();
  const { favoriteIds, toggleFavorite } = useUserData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [period, setPeriod] = useState<EventPeriod>('all');
  const [now, setNow] = useState(() => new Date());
  const [visibleVenueCount, setVisibleVenueCount] = useState(5);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const locationRequestId = useRef(0);
  const [locationSavedAt, setLocationSavedAt] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(10); // Raio inicial de 10km
  const [distanceFilterActive, setDistanceFilterActive] = useState(false);

  const { language } = usePreferences();
  const { width: windowWidth } = useWindowDimensions();
  const t = copy[language];
  const featuredCardWidth = Math.max(280, windowWidth - 36);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(savedLocationKey).then(raw => {
      if (!active || !raw) return;
      const saved = JSON.parse(raw) as Coordinates & { savedAt: string };
      if (hasValidCoordinates(saved)) {
        setUserLocation({ latitude: saved.latitude, longitude: saved.longitude });
        setDistanceFilterActive(true);
        if (Number.isFinite(new Date(saved.savedAt).getTime())) setLocationSavedAt(saved.savedAt);
      }
    }).catch(() => {
      // A busca continua disponível mesmo se a leitura local falhar.
    });
    return () => { active = false; locationRequestId.current += 1; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const buscarLocalizacao = async () => {
    const requestId = ++locationRequestId.current;
    setDistanceFilterActive(true);
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (requestId !== locationRequestId.current) return;
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Negada',
          'Precisamos da sua localização para sugerir eventos perto de você. Se houver uma posição salva, ela continuará em uso.'
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      if (requestId !== locationRequestId.current) return;
      const { latitude, longitude } = currentLocation.coords;
      if (!hasValidCoordinates({ latitude, longitude })) throw new Error('Coordenadas inválidas');
      const savedAt = new Date().toISOString();
      await AsyncStorage.setItem(savedLocationKey, JSON.stringify({ latitude, longitude, savedAt }));
      if (requestId !== locationRequestId.current) return;
      setUserLocation({ latitude, longitude });
      setLocationSavedAt(savedAt);
      Alert.alert('Localização salva', 'As coordenadas foram salvas neste aparelho e associadas à busca de eventos próximos.');

    } catch {
      if (requestId !== locationRequestId.current) return;
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter ou salvar sua localização. Verifique o GPS e tente novamente. A localização anterior foi preservada.'
      );
    } finally {
      if (requestId === locationRequestId.current) setLoadingLocation(false);
    }
  };

  const cancelarLocalizacao = () => {
    locationRequestId.current += 1;
    setLoadingLocation(false);
  };

  const changeRadius = (value: number) => {
    setSearchRadius(value);
    setDistanceFilterActive(true);
  };

  const visible = useMemo(() => {
    const term = normalize(query);
    return events.flatMap((event) => {
      const searchable = normalize(`${event.title} ${event.venue} ${event.genre} ${event.highlight} ${event.mood}`);
      if ((term && !searchable.includes(term)) || !matchesFilter(event, filter) || !isEventInPeriod(event.startsAt, period, now)) return [];
      const distance = distanceFromUserKm(userLocation, event);
      if (distanceFilterActive && !isWithinRadiusKm(distance, searchRadius)) return [];
      return [{ event, distance }];
    }).sort((a, b) => userLocation ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : 0);
  }, [distanceFilterActive, events, filter, now, period, query, searchRadius, userLocation]);

  const filteredVenues = useMemo(() => {
    const term = normalize(query);
    return venues.filter(venue =>
      (!term || normalize(`${venue.name} ${venue.category} ${venue.address}`).includes(term)) &&
      (!distanceFilterActive || isWithinRadiusKm(distanceFromUserKm(userLocation, venue), searchRadius))
    ).sort((a, b) => userLocation
      ? (distanceFromUserKm(userLocation, a) ?? Infinity) - (distanceFromUserKm(userLocation, b) ?? Infinity)
      : 0);
  }, [distanceFilterActive, query, searchRadius, userLocation, venues]);
  const featuredVenues = useMemo(() => {
    const names = ['Restaurante Marisco', 'Villa Bistrô', 'P22'];
    return names.map(name => filteredVenues.find(venue => venue.name === name)).filter((venue): venue is Venue => Boolean(venue));
  }, [filteredVenues]);

  useEffect(() => {
    setVisibleVenueCount(5);
  }, [query]);

  const eventResults = (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{distanceFilterActive || query || filter !== 'all' || period !== 'all' ? t.results : t.upcoming}</Text>
        <Text style={styles.count}>{visible.length}</Text>
      </View>
      <View style={styles.eventList}>
        {visible.length ? visible.map(({ event, distance }) => (
          <EventCard key={event.id} event={event} distanceKm={distance} saved={favoriteIds.includes(event.id)} onToggleSaved={() => void toggleFavorite(event)} />
        )) : (
          <EmptyState title={t.emptyTitle} text={distanceFilterActive && !userLocation ? t.needLocation : distanceFilterActive && searchRadius === 0 ? t.zeroDistance : t.emptyText} />
        )}
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Brand compact />
          <View style={styles.headerControls}><ThemeSwitch /><LanguageSwitch /></View>
        </View>

        <Text style={styles.eyebrow}>{t.eyebrow}</Text>
        <Text style={[styles.hero, language === 'en' && styles.heroEnglish]}>{t.hero}</Text>
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
            <Text
              key={item}
              onPress={() => {
                setFilter(item);
              }}
              style={[styles.filter, filter === item && styles.filterActive]}
            >
              {t.filters[item]}
            </Text>
          ))}
        </ScrollView>

        <View style={styles.periodSection}>
          <Text style={styles.periodLabel}>{t.when}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodOptions}>
            {periods.map(item => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: period === item }}
                onPress={() => setPeriod(item)}
                style={[styles.periodOption, period === item && styles.periodOptionActive]}>
                <Text style={[styles.periodOptionText, period === item && styles.periodOptionTextActive]}>{t.periods[item]}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.radiusHeader}>
            <Text style={styles.radiusLabel}>{t.radius}</Text>
            <Text style={styles.radiusValue}>{distanceFilterActive ? `${searchRadius} km` : t.noDistanceLimit}</Text>
          </View>
          <DistanceSlider value={searchRadius} onChange={changeRadius} onChangeComplete={() => { if (!userLocation && !loadingLocation) void buscarLocalizacao(); }} label={t.radius} />
          <View style={styles.radiusControls}>
            <Pressable accessibilityRole="button" accessibilityLabel={t.decreaseRadius} style={styles.radiusButton} onPress={() => { changeRadius(Math.max(0, searchRadius - 5)); if (!userLocation && !loadingLocation) void buscarLocalizacao(); }}>
              <Text style={styles.radiusButtonText}>−</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t.increaseRadius} style={styles.radiusButton} onPress={() => { changeRadius(Math.min(100, searchRadius + 5)); if (!userLocation && !loadingLocation) void buscarLocalizacao(); }}>
              <Text style={styles.radiusButtonText}>+</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setDistanceFilterActive(false)} style={styles.clearDistanceButton}>
              <Text style={styles.clearDistanceText}>{t.allDistances}</Text>
            </Pressable>
          </View>

          {loadingLocation ? (
            <View style={styles.locationProgress}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Pressable accessibilityRole="button" onPress={cancelarLocalizacao} style={styles.radiusButton}>
                <Text style={styles.coords}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.locationButton} onPress={buscarLocalizacao}>
              <MapPin size={20} color={colors.ink} />
              <Text style={styles.locationButtonText}>{userLocation ? 'Atualizar localização (GPS)' : 'Eventos perto de mim (GPS)'}</Text>
            </Pressable>
          )}
          {userLocation && (
            <View>
              <Text style={styles.coords}>{t.locationSaved} · {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}</Text>
              <Text style={styles.coords}>{distanceFilterActive ? `${t.eventsWithin} ${searchRadius} km · ` : ''}{t.savedAt} {locationSavedAt ? new Date(locationSavedAt).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US') : t.thisDevice}</Text>
            </View>
          )}
          {!userLocation ? <Text style={styles.locationHint}>{distanceFilterActive ? t.needLocation : t.enableLocation}</Text> : null}
        </View>

        {distanceFilterActive ? eventResults : null}

        {!distanceFilterActive && !query && filter === 'all' && period === 'all' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.featured}</Text>
              <Text style={styles.source}>{source === 'supabase' ? 'AO VIVO' : source === 'cache' ? 'OFFLINE' : 'DEMO'}</Text>
            </View>
            <ScrollView
              horizontal
              decelerationRate="fast"
              disableIntervalMomentum
              snapToInterval={featuredCardWidth + 18}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}>
              {visible.slice(0, 2).map(({ event, distance }) => (
                <EventCard
                  key={event.id}
                  event={event}
                  distanceKm={distance}
                  featured
                  featuredWidth={featuredCardWidth}
                  saved={favoriteIds.includes(event.id)}
                  onToggleSaved={() => void toggleFavorite(event)}
                />
              ))}
              {featuredVenues.map(venue => (
                <FeaturedVenueCard
                  key={`featured-${venue.id}`}
                  venue={venue}
                  width={featuredCardWidth}
                  label={t.venueSpotlight}
                  cta={t.openVenue}
                  category={localizeVenueCategory(venue.category, language)}
                />
              ))}
              {visible.slice(2, 4).map(({ event, distance }) => (
                <EventCard
                  key={event.id}
                  event={event}
                  distanceKm={distance}
                  featured
                  featuredWidth={featuredCardWidth}
                  saved={favoriteIds.includes(event.id)}
                  onToggleSaved={() => void toggleFavorite(event)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {!distanceFilterActive ? <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t.explore}</Text></View> : null}
        {!distanceFilterActive ? (
        <View style={styles.eventList}>
          {filteredVenues.slice(0, visibleVenueCount).map(venue => (
            <Pressable key={venue.id} style={styles.venueCard} accessibilityRole="button"
              onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}>
              {venue.coverAsset || venue.coverUrl ? <Image source={venue.coverAsset || { uri: venue.coverUrl }} resizeMode="cover" style={styles.venueImage} /> : <Text style={styles.venueIcon}>📍</Text>}
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <Text style={styles.subtitleSmall}>{venue.photoIllustrative ? t.illustrative : venue.photoCredit}</Text>
                <Text style={styles.subtitleSmall}>{localizeVenueCategory(venue.category, language)} · {venue.address}{userLocation ? ` · ${formatDistance(distanceFromUserKm(userLocation, venue)!, language)}` : ''}</Text>
                <Text style={styles.source} numberOfLines={2}>{t.profile}</Text>
              </View>
            </Pressable>
          ))}
          {filteredVenues.length > 5 ? (
            <Pressable
              accessibilityRole="button"
              style={styles.moreButton}
              onPress={() => setVisibleVenueCount(current => current < filteredVenues.length ? Math.min(current + 5, filteredVenues.length) : 5)}>
              <Text style={styles.moreButtonText}>
                {visibleVenueCount < filteredVenues.length
                  ? `${t.moreVenues} (${Math.min(5, filteredVenues.length - visibleVenueCount)})`
                  : t.onlyFiveVenues}
              </Text>
            </Pressable>
          ) : null}
        </View>
        ) : null}
        {!distanceFilterActive ? <CommunityFeed /> : null}
        {!distanceFilterActive ? eventResults : null}
      </ScrollView>
    </View>
  );
}

const copy = {
  pt: {
    eyebrow: 'SUA NOITE COMEÇA AQUI',
    hero: 'Descubra o que está acontecendo agora.',
    subtitle: 'Eventos, música e lugares que combinam com a sua vibe.',
    search: 'Buscar eventos ou locais',
    featured: 'Em destaque',
    results: 'Resultados',
    upcoming: 'Próximos eventos',
    emptyTitle: 'Nada por aqui',
    emptyText: 'Tente outro termo ou remova um dos filtros.',
    explore: 'Explore Saquarema',
    illustrative: 'Imagem ilustrativa',
    profile: 'VER PERFIL →',
    venueSpotlight: 'LOCAL EM DESTAQUE',
    openVenue: 'ABRIR PERFIL E AVALIAÇÕES →',
    moreVenues: 'Ver mais estabelecimentos',
    onlyFiveVenues: 'Mostrar apenas 5 estabelecimentos',
    radius: 'Distância máxima dos eventos', decreaseRadius: 'Diminuir raio em 5 quilômetros', increaseRadius: 'Aumentar raio em 5 quilômetros',
    locationSaved: 'Localização salva', eventsWithin: 'Eventos em até', savedAt: 'salvo em', thisDevice: 'este aparelho',
    enableLocation: 'Ative o GPS para filtrar por distância e ver os quilômetros de cada evento.',
    needLocation: 'Autorize o GPS para calcular a distância. Sem localização, nenhum evento pode ser confirmado dentro do raio.',
    zeroDistance: 'Nenhum evento está exatamente na sua localização. Aumente a distância para ver os próximos.',
    noDistanceLimit: 'Sem limite', allDistances: 'Todas as distâncias',
    filters: { all: 'Tudo', free: 'Grátis', live: 'Ao vivo', beach: 'Praia' },
    when: 'Quando', periods: { all: 'Todos', today: 'Hoje', week: 'Próximos 7 dias' },
  },
  en: {
    eyebrow: 'YOUR NIGHT STARTS HERE',
    hero: "Find what's happening tonight.",
    subtitle: 'Events, music and places for your night.',
    search: 'Search events or places',
    featured: 'Featured',
    results: 'Results',
    upcoming: 'Upcoming events',
    emptyTitle: 'Nothing here yet',
    emptyText: 'Try another search or remove a filter.',
    explore: 'Explore Saquarema',
    illustrative: 'Illustrative image',
    profile: 'VIEW PROFILE →',
    venueSpotlight: 'FEATURED VENUE',
    openVenue: 'OPEN PROFILE AND REVIEWS →',
    moreVenues: 'See more venues',
    onlyFiveVenues: 'Show only 5 venues',
    radius: 'Maximum event distance', decreaseRadius: 'Decrease radius by 5 kilometers', increaseRadius: 'Increase radius by 5 kilometers',
    locationSaved: 'Location saved', eventsWithin: 'Events within', savedAt: 'saved at', thisDevice: 'this device',
    enableLocation: 'Enable GPS to filter by distance and see how far each event is.',
    needLocation: 'Allow GPS to calculate distance. Without your location, no event can be confirmed within the radius.',
    zeroDistance: 'No event is exactly at your location. Increase the radius to see nearby events.',
    noDistanceLimit: 'No limit', allDistances: 'All distances',
    filters: { all: 'All', free: 'Free', live: 'Live', beach: 'Beach' },
    when: 'When', periods: { all: 'All', today: 'Today', week: 'Next 7 days' },
  },
} as const;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function matchesFilter(event: NightEvent, filter: Filter) {
  const text = normalize(`${event.genre} ${event.mood} ${event.venue} ${event.highlight}`);
  if (filter === 'free') return normalize(event.price).includes('gratis');
  if (filter === 'live') return text.includes('ao vivo') || text.includes('samba') || text.includes('rock');
  if (filter === 'beach') return text.includes('praia') || text.includes('orla') || text.includes('mar');

  return true;
}

function FeaturedVenueCard({ venue, width, label, cta, category }: { venue: Venue; width: number; label: string; cta: string; category: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cta} ${venue.name}`}
      onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}
      style={({ pressed }) => [styles.featuredVenueCard, { width }, pressed && styles.pressed]}>
      {venue.coverAsset || venue.coverUrl ? <Image source={venue.coverAsset || { uri: venue.coverUrl }} resizeMode="cover" style={styles.featuredVenueImage} /> : null}
      <View style={styles.featuredVenueOverlay} />
      <View style={styles.featuredVenueContent}>
        <View style={styles.featuredVenueBadge}><Text style={styles.featuredVenueBadgeText}>{label}</Text></View>
        <Text style={styles.featuredVenueTitle} numberOfLines={2}>{venue.name}</Text>
        <View style={styles.featuredVenueLocation}>
          <MapPin size={15} color={colors.accent} />
          <Text style={styles.featuredVenueMeta} numberOfLines={2}>{venue.address}</Text>
        </View>
        <Text style={styles.featuredVenueCategory} numberOfLines={1}>{category}</Text>
        <Text style={styles.featuredVenueCta} numberOfLines={2}>{cta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  venueCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  venueImage: { width: 85, height: 90, borderRadius: 12 },
  venueIcon: { fontSize: 30, width: 45, textAlign: 'center' },
  venueName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  subtitleSmall: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingBottom: 56 },
  topbar: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headerControls: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginTop: 38, paddingHorizontal: 18 },
  hero: { color: colors.text, fontSize: 39, lineHeight: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: 10, paddingHorizontal: 18 },
  heroEnglish: { fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 13, paddingHorizontal: 18, maxWidth: 380 },
  searchBox: { minHeight: 54, marginHorizontal: 18, marginTop: 26, paddingHorizontal: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minWidth: 0, color: colors.text, fontSize: 15, height: 52 },
  filters: { paddingHorizontal: 18, paddingVertical: 16, gap: 9 },
  filter: { overflow: 'hidden', color: colors.muted, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, fontSize: 13, fontWeight: '800' },
  filterActive: { color: colors.ink, backgroundColor: colors.accent, borderColor: colors.accent },
  periodSection: { paddingHorizontal: 18, marginBottom: 18, gap: 9 },
  periodLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  periodOptions: { flexDirection: 'row', gap: 8 },
  periodOption: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  periodOptionActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  periodOptionText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  periodOptionTextActive: { color: colors.ink },

  locationContainer: { paddingHorizontal: 18, marginBottom: 15 },
  locationButton: { flexDirection: 'row', backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  locationButtonText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  coords: { marginTop: 10, color: colors.accent, fontWeight: '800', fontSize: 12 },
  locationHint: { marginTop: 9, color: colors.muted, fontSize: 12, lineHeight: 18 },

  sectionHeader: { marginTop: 18, marginBottom: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  source: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  count: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  featuredList: { paddingLeft: 18, paddingRight: 18 },
  eventList: { paddingHorizontal: 18, gap: 14 },
  featuredVenueCard: { minHeight: 390, marginRight: 18, overflow: 'hidden', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  featuredVenueImage: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  featuredVenueOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5,5,7,0.48)' },
  featuredVenueContent: { marginTop: 'auto', padding: 18, gap: 8 },
  featuredVenueBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(226,255,84,0.15)', borderColor: 'rgba(226,255,84,0.45)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  featuredVenueBadgeText: { color: colors.accent, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  featuredVenueTitle: { color: colors.text, fontSize: 31, lineHeight: 34, fontWeight: '900', letterSpacing: -0.8 },
  featuredVenueLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredVenueMeta: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 19 },
  featuredVenueCategory: { color: colors.muted, fontSize: 13 },
  featuredVenueCta: { color: colors.accent, fontSize: 12, lineHeight: 17, fontWeight: '900', letterSpacing: 0.5 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.accent, backgroundColor: 'rgba(226,255,84,0.08)', paddingHorizontal: 14 },
  moreButtonText: { color: colors.accent, fontSize: 13, fontWeight: '900', textAlign: 'center' },

  radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 },
  radiusLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  radiusValue: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  radiusControls: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  locationProgress: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radiusButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  radiusButtonText: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  clearDistanceButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 },
  clearDistanceText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
});
