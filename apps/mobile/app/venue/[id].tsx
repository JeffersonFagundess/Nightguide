import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, MessageSquare, RefreshCw, Star, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { PostImage } from '@/src/components/post-image';
import { Screen } from '@/src/components/screen';
import { EmptyState, LoadingState } from '@/src/components/state';
import { isUuid, readJson, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import { getDemoReviews } from '@/src/data/demo-reviews';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import type { Review } from '@/src/types';
import { localizeVenueCategory, localizeVenueDescription } from '@/src/lib/i18n';

export default function VenueProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const venueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { venues } = useNightData();
  const { user, profile } = useAuth();
  const { reviews: localReviews } = useUserData();
  const { language } = usePreferences();
  const t = venueCopy[language];
  const venue = venues.find((item) => item.id === venueId);
  const [remoteReviews, setRemoteReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const loadReviews = useCallback(async (manual = false) => {
    if (!venueId) return;
    if (manual) setRefreshing(true);
    const cacheKey = `nightguide:venue-reviews:v3:${venueId}`;
    const demoReviews = getDemoReviews(venue?.name);

    try {
      const cached = await readJson<Review[]>(cacheKey, []);
      if (cached.length) setRemoteReviews(cached);
      else if (demoReviews.length) setRemoteReviews(demoReviews);

      if (!supabase || !isUuid(venueId)) return;
      const { data, error } = await supabase
        .from('reviews')
        .select('id,user_id,venue_id,rating,comment,image_url,author_name,author_avatar_url,created_at')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const next = (data || []).map<Review>((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        venueId: String(row.venue_id),
        venue: venue?.name || 'Estabelecimento',
        rating: Number(row.rating),
        comment: String(row.comment || ''),
        createdAt: String(row.created_at),
        photoUrl: row.image_url ? String(row.image_url) : undefined,
        authorName: String(row.author_name || 'NightGuide'),
        authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
      }));
      const visibleReviews = [...next, ...demoReviews];
      setRemoteReviews(visibleReviews);
      await writeJson(cacheKey, visibleReviews);
    } catch {
      // Keep cached publications visible while offline.
      if (!remoteReviews.length && demoReviews.length) setRemoteReviews(demoReviews);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [venue?.name, venueId]);

  useEffect(() => {
    setVisibleCount(5);
    void loadReviews();
  }, [loadReviews]);

  const publications = useMemo(() => {
    const ownLocal = localReviews
      .filter((review) => review.venueId === venueId)
      .map((review) => ({ ...review, userId: user?.id, authorName: profile?.fullName || 'NightGuide' }));
    const otherRemote = remoteReviews.filter((review) => !ownLocal.some(local => local.id === review.id || (local.userId === review.userId && local.venueId === review.venueId)));
    return [...ownLocal, ...otherRemote].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [localReviews, profile?.fullName, remoteReviews, user, venueId]);
  const visiblePublications = publications.slice(0, visibleCount);

  if (!venue) {
    return <Screen contentStyle={styles.center}><EmptyState title={t.notFound} text={t.notFoundText} action={{ label: t.back, onPress: () => router.back() }} /></Screen>;
  }

  return (
    <Screen>
      {venue.coverAsset || venue.coverUrl ? <Image source={venue.coverAsset || { uri: venue.coverUrl }} resizeMode="cover" style={styles.cover} /> : <View style={styles.coverFallback}><MapPin size={36} color={colors.accent} /></View>}
      <Text style={styles.eyebrow}>{t.profile}</Text>
      {venue.photoCredit ? <Text style={styles.meta} onPress={() => { if (venue.photoSource) void Linking.openURL(venue.photoSource).catch(() => undefined); }}>{venue.photoCredit} · {t.source}</Text> : null}
      {venue.photoIllustrative === false && venue.photoSource?.includes('wikimedia.org') ? <Text style={styles.meta} onPress={() => void Linking.openURL('https://creativecommons.org/licenses/by-sa/3.0/').catch(() => undefined)}>{t.historicalPhoto}</Text> : null}
      <Text style={styles.title}>{venue.name}</Text>
      <View style={styles.metaRow}>
        <MapPin size={15} color={colors.accent} />
        <Text style={styles.meta}>{localizeVenueCategory(venue.category, language)} • {venue.address}</Text>
      </View>
      <Text style={styles.description}>{localizeVenueDescription(venue.vibe, venue.category, language)}</Text>
      <View style={styles.scoreCard}>
        <Star size={20} color={colors.accent} fill={colors.accent} />
        <Text style={styles.score}>{venue.rating.toFixed(1)}</Text>
        <Text style={styles.scoreLabel}>{publications.length} {publications.length === 1 ? t.post : t.posts}</Text>
      </View>

      {venue.galleryAssets?.length ? (
        <View style={styles.gallerySection}>
          <Text style={styles.sectionEyebrow}>{t.gallery}</Text>
          <Text style={styles.galleryTitle}>{t.galleryTitle} ({venue.galleryAssets.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryContent}>
            {venue.galleryAssets.map((asset, index) => (
              <Image
                key={`${venue.id}-gallery-${index}`}
                accessibilityLabel={`${t.galleryImage} ${index + 1}`}
                source={asset}
                resizeMode="cover"
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>{t.community}</Text>
          <Text style={styles.sectionTitle}>{t.peoplePosted}</Text>
        </View>
        <Pressable accessibilityLabel={t.refresh} disabled={refreshing} onPress={() => void loadReviews(true)} style={styles.refreshButton}>
          <RefreshCw size={18} color={refreshing ? colors.muted : colors.text} />
        </Pressable>
      </View>

      {loading && !publications.length ? <LoadingState label={t.loading} /> : publications.length ? (
        <View style={styles.feed}>
          {visiblePublications.map((review) => (
            <View key={`${review.userId || 'local'}-${review.id}`} style={styles.post}>
              <View style={styles.postHeader}>
                {review.authorAvatarUrl ? <Image source={{ uri: review.authorAvatarUrl }} style={styles.avatarImage} /> : <View style={styles.avatar}><UserRound size={19} color={colors.accent} /></View>}
                <View style={styles.postHeaderCopy}>
                  <Text style={styles.author}>{review.authorName || 'NightGuide'}</Text>
                  <Text style={styles.venueLine}>📍 {venue.name}</Text>
                </View>
                <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</Text>
              </View>
              <Text style={styles.postDescription}>{review.comment}</Text>
              {review.photoAsset || review.photoUri || review.photoUrl ? <PostImage source={review.photoAsset || { uri: review.photoUri || review.photoUrl }} /> : null}
              <View style={styles.postFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.rating}>{'★'.repeat(review.rating)}<Text style={styles.ratingMuted}>{'★'.repeat(5 - review.rating)}</Text></Text>
                  {review.isDemo ? <Text style={styles.exampleLabel}>{t.demoPhoto}</Text> : null}
                </View>
              </View>
            </View>
          ))}
          {publications.length > 5 ? (
            <Pressable
              accessibilityRole="button"
              style={styles.moreButton}
              onPress={() => setVisibleCount(current => current < publications.length ? Math.min(current + 5, publications.length) : 5)}>
              <Text style={styles.moreButtonText}>
                {visibleCount < publications.length
                  ? `${t.moreReviews} (${Math.min(5, publications.length - visibleCount)})`
                  : t.onlyFive}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title={t.noPosts}
          text={t.noPostsText}
          action={{
            label: user ? t.createPost : t.signInPost,
            onPress: () => user
              ? router.push({ pathname: '/(tabs)/account', params: { venueId } })
              : router.push({ pathname: '/auth/login', params: { next: `/venue/${venueId}` } }),
          }}
        />
      )}
      <Button
        label={user ? t.publishPhoto : t.signInPost}
        icon={MessageSquare}
        onPress={() => user
          ? router.push({ pathname: '/(tabs)/account', params: { venueId } })
          : router.push({ pathname: '/auth/login', params: { next: `/venue/${venueId}` } })}
        style={styles.publishButton}
      />
      <Button
        label={t.openMap}
        icon={MapPin}
        variant="secondary"
        onPress={() => router.push({ pathname: '/(tabs)/map', params: { venueId: venue.id } })}
        style={styles.mapButton}
      />
    </Screen>
  );
}

const venueCopy = {
  pt: { notFound: 'Local não encontrado', notFoundText: 'Esse estabelecimento não está disponível no momento.', back: 'Voltar ao mapa', profile: 'PERFIL DO ESTABELECIMENTO', source: 'Ver fonte', historicalPhoto: 'Foto histórica sem edição · Licença CC BY-SA 3.0', post: 'publicação', posts: 'publicações', gallery: 'GALERIA', galleryTitle: 'Fotos do local', galleryImage: 'Foto do local', community: 'COMUNIDADE', peoplePosted: 'O que as pessoas publicaram', refresh: 'Atualizar publicações', loading: 'Carregando publicações…', demoPhoto: 'DEMONSTRAÇÃO · FOTO DO LOCAL FORNECIDA PELO PROJETO', noPosts: 'Ainda não há publicações', noPostsText: 'Seja a primeira pessoa a contar como foi a experiência neste local.', createPost: 'Criar publicação', signInPost: 'Entrar para publicar', publishPhoto: 'Publicar comentário com foto', moreReviews: 'Ver mais avaliações', onlyFive: 'Mostrar apenas 5', openMap: 'Ver endereço exato no mapa' },
  en: { notFound: 'Venue not found', notFoundText: 'This venue is not available right now.', back: 'Back to map', profile: 'VENUE PROFILE', source: 'View source', historicalPhoto: 'Unedited historical photo · CC BY-SA 3.0 license', post: 'post', posts: 'posts', gallery: 'GALLERY', galleryTitle: 'Venue photos', galleryImage: 'Venue photo', community: 'COMMUNITY', peoplePosted: 'What visitors posted', refresh: 'Refresh posts', loading: 'Loading posts…', demoPhoto: 'DEMO · VENUE PHOTO PROVIDED BY THE PROJECT', noPosts: 'No posts yet', noPostsText: 'Be the first person to share an experience at this venue.', createPost: 'Create post', signInPost: 'Sign in to post', publishPhoto: 'Post a review with photo', moreReviews: 'See more reviews', onlyFive: 'Show only 5', openMap: 'View exact address on map' },
} as const;

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  cover: { width: '100%', height: 230, borderRadius: 22, backgroundColor: colors.elevated },
  coverFallback: { width: '100%', height: 180, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 22 },
  title: { color: colors.text, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 13, flex: 1 },
  description: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 14 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  score: { color: colors.text, fontSize: 20, fontWeight: '900' },
  scoreLabel: { color: colors.muted, fontSize: 12, marginLeft: 4 },
  gallerySection: { marginTop: 24 },
  galleryTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 5, marginBottom: 12 },
  galleryContent: { gap: 10, paddingRight: 18 },
  galleryImage: { width: 250, height: 170, borderRadius: 16, backgroundColor: colors.elevated },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 28, marginBottom: 14 },
  sectionEyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 5 },
  refreshButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  feed: { gap: 14 },
  post: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  avatarImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.elevated },
  postHeaderCopy: { flex: 1 },
  author: { color: colors.text, fontWeight: '900', fontSize: 14 },
  venueLine: { color: colors.muted, fontSize: 12, marginTop: 2 },
  date: { color: colors.muted, fontSize: 10 },
  postDescription: { color: colors.text, fontSize: 14, lineHeight: 21, paddingHorizontal: 13, paddingBottom: 13 },
  postFooter: { padding: 13 },
  footerLeft: { gap: 5 },
  rating: { color: colors.accent, letterSpacing: 1 },
  ratingMuted: { color: colors.border },
  exampleLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  publishButton: { marginTop: 18 },
  mapButton: { marginTop: 10 },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.accent, backgroundColor: 'rgba(226,255,84,0.08)' },
  moreButtonText: { color: colors.accent, fontSize: 13, fontWeight: '900' },
});
