import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, MessageSquare, RefreshCw, Star, UserRound } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { Screen } from '@/src/components/screen';
import { EmptyState, LoadingState } from '@/src/components/state';
import { isUuid, readJson, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import { getDemoReviews } from '@/src/data/demo-reviews';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';
import type { Review } from '@/src/types';

export default function VenueProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const venueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { venues } = useNightData();
  const { user, profile } = useAuth();
  const { reviews: localReviews } = useUserData();
  const venue = venues.find((item) => item.id === venueId);
  const [remoteReviews, setRemoteReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = useCallback(async (manual = false) => {
    if (!venueId) return;
    if (manual) setRefreshing(true);
    const cacheKey = `nightguide:venue-reviews:v1:${venueId}`;
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
      const visibleReviews = next.length ? next : demoReviews;
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
    void loadReviews();
  }, [loadReviews]);

  const publications = useMemo(() => {
    const ownLocal = localReviews
      .filter((review) => review.venueId === venueId)
      .map((review) => ({ ...review, userId: user?.id, authorName: profile?.fullName || 'NightGuide' }));
    const otherRemote = user ? remoteReviews.filter((review) => review.userId !== user.id) : remoteReviews;
    return [...ownLocal, ...otherRemote].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [localReviews, profile?.fullName, remoteReviews, user, venueId]);

  if (!venue) {
    return <Screen contentStyle={styles.center}><EmptyState title="Local não encontrado" text="Esse estabelecimento não está disponível no momento." action={{ label: 'Voltar ao mapa', onPress: () => router.back() }} /></Screen>;
  }

  return (
    <Screen>
      {venue.coverUrl ? <Image source={{ uri: venue.coverUrl }} resizeMode="cover" style={styles.cover} /> : <View style={styles.coverFallback}><MapPin size={36} color={colors.accent} /></View>}
      <Text style={styles.eyebrow}>PERFIL DO ESTABELECIMENTO</Text>
      <Text style={styles.title}>{venue.name}</Text>
      <View style={styles.metaRow}>
        <MapPin size={15} color={colors.accent} />
        <Text style={styles.meta}>{venue.category} • {venue.address}</Text>
      </View>
      <Text style={styles.description}>{venue.vibe}</Text>
      <View style={styles.scoreCard}>
        <Star size={20} color={colors.accent} fill={colors.accent} />
        <Text style={styles.score}>{venue.rating.toFixed(1)}</Text>
        <Text style={styles.scoreLabel}>{publications.length} {publications.length === 1 ? 'publicação' : 'publicações'}</Text>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>COMUNIDADE</Text>
          <Text style={styles.sectionTitle}>O que as pessoas publicaram</Text>
        </View>
        <Pressable accessibilityLabel="Atualizar publicações" disabled={refreshing} onPress={() => void loadReviews(true)} style={styles.refreshButton}>
          <RefreshCw size={18} color={refreshing ? colors.muted : colors.text} />
        </Pressable>
      </View>

      {loading && !publications.length ? <LoadingState label="Carregando publicações…" /> : publications.length ? (
        <View style={styles.feed}>
          {publications.map((review) => (
            <View key={`${review.userId || 'local'}-${review.id}`} style={styles.post}>
              <View style={styles.postHeader}>
                {review.authorAvatarUrl ? <Image source={{ uri: review.authorAvatarUrl }} style={styles.avatarImage} /> : <View style={styles.avatar}><UserRound size={19} color={colors.accent} /></View>}
                <View style={styles.postHeaderCopy}>
                  <Text style={styles.author}>{review.authorName || 'NightGuide'}</Text>
                  <Text style={styles.venueLine}>📍 {venue.name}</Text>
                </View>
                <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString('pt-BR')}</Text>
              </View>
              <Text style={styles.postDescription}>{review.comment}</Text>
              {review.photoUri || review.photoUrl ? <Image source={{ uri: review.photoUri || review.photoUrl }} resizeMode="cover" style={styles.postImage} /> : null}
              <View style={styles.postFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.rating}>{'★'.repeat(review.rating)}<Text style={styles.ratingMuted}>{'★'.repeat(5 - review.rating)}</Text></Text>
                  {review.isDemo ? <Text style={styles.exampleLabel}>EXEMPLO</Text> : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="Ainda não há publicações"
          text="Seja a primeira pessoa a contar como foi a experiência neste local."
          action={{
            label: user ? 'Criar publicação' : 'Entrar para publicar',
            onPress: () => user
              ? router.push({ pathname: '/(tabs)/account', params: { venueId } })
              : router.push({ pathname: '/auth/login', params: { next: `/venue/${venueId}` } }),
          }}
        />
      )}
      <Button
        label={user ? 'Publicar comentário com foto' : 'Entrar para publicar'}
        icon={MessageSquare}
        onPress={() => user
          ? router.push({ pathname: '/(tabs)/account', params: { venueId } })
          : router.push({ pathname: '/auth/login', params: { next: `/venue/${venueId}` } })}
        style={styles.publishButton}
      />
    </Screen>
  );
}

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
  postImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.elevated },
  postFooter: { padding: 13 },
  footerLeft: { gap: 5 },
  rating: { color: colors.accent, letterSpacing: 1 },
  ratingMuted: { color: colors.border },
  exampleLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  publishButton: { marginTop: 18 },
});
