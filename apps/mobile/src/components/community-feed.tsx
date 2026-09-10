import { router, useFocusEffect } from 'expo-router';
import * as Network from 'expo-network';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { readJson, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';
import type { Review } from '@/src/types';
import { getDemoReviews } from '@/src/data/demo-reviews';

const cacheKey = 'nightguide:public-feed:v2';

export function CommunityFeed() {
  const { venues } = useNightData();
  const { user, profile } = useAuth();
  const { reviews: local } = useUserData();
  const { language } = usePreferences();
  const pt = language === 'pt';
  const [remote, setRemote] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const demoPosts = useMemo(() => venues.slice(0, 4).flatMap(venue => getDemoReviews(venue.name)), [venues]);
  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      setLoading(true);
      try {
        const cached = await readJson<Review[]>(cacheKey, []);
        if (active) setRemote(cached);
        if (!supabase) return;
        const { data, error: queryError } = await supabase.from('reviews')
          .select('id,user_id,venue_id,rating,comment,image_url,author_name,created_at')
          .order('created_at', { ascending: false }).limit(50).abortSignal(AbortSignal.timeout(10000));
        if (queryError) throw queryError;
        const next = (data || []).map<Review>(row => ({
          id: String(row.id), userId: String(row.user_id), venueId: String(row.venue_id), venue: '',
          rating: Math.max(0, Math.min(5, Number(row.rating) || 0)), comment: String(row.comment || ''),
          photoUrl: row.image_url || undefined, authorName: row.author_name || 'NightGuide', createdAt: String(row.created_at),
        }));
        if (active) { setRemote(next); setError(false); }
        await writeJson(cacheKey, next);
      } catch { if (active) setError(true); }
      finally { busy = false; if (active) setLoading(false); }
    };
    void load();
    const subscription = Network.addNetworkStateListener(state => { if (state.isConnected) void load(); });
    return () => { active = false; subscription.remove(); };
  }, []));
  const posts = useMemo(() => {
    const own = user ? local.map(review => ({ ...review, userId: user.id, authorName: profile?.fullName || 'NightGuide' })) : [];
    return [...own, ...remote.filter(review => !own.some(item => item.venueId === review.venueId && item.userId === review.userId))]
      .filter(review => venues.some(venue => venue.id === review.venueId) && !review.isDemo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [local, remote, user, profile?.fullName, venues]);
  return <View style={styles.section}>
    <Text style={styles.heading}>{pt ? 'Avaliações da comunidade' : 'Community reviews'}</Text>
    <Text style={styles.hint}>{pt ? 'Fotos e experiências de quem visitou. Visível também sem login.' : 'Photos and experiences from visitors. No login needed to read.'}</Text>
    {loading ? <Text style={styles.hint}>{pt ? 'Atualizando avaliações…' : 'Updating reviews…'}</Text> : null}
    {error ? <Text style={styles.hint}>{pt ? 'Sem atualização agora. Mostrando o conteúdo salvo neste aparelho.' : 'Unable to update. Showing content saved on this device.'}</Text> : null}
    {!posts.length && !loading ? <Text style={styles.hint}>{pt ? 'Ainda não há avaliações nestes locais. Abra um perfil para publicar a primeira.' : 'No reviews yet. Open a venue to share the first one.'}</Text> : null}
    {[...posts.slice(0, 20), ...demoPosts].map(review => <Pressable key={`${review.userId}-${review.id}`} style={styles.post}
      accessibilityRole="button" onPress={() => router.push({ pathname: '/venue/[id]', params: { id: review.venueId } })}>
      <Text style={styles.author}>{review.authorName}</Text>
      {review.isDemo ? <Text style={styles.stars}>{pt ? 'DEMONSTRAÇÃO · FOTO ILUSTRATIVA, NÃO É DO LOCAL' : 'DEMO · ILLUSTRATIVE PHOTO, NOT THIS VENUE'}</Text> : null}
      <Text style={styles.hint}>📍 {venues.find(venue => venue.id === review.venueId)?.name}</Text>
      <Text style={styles.comment}>{review.comment}</Text>
      {review.photoUri || review.photoUrl ? <Image source={{ uri: review.photoUri || review.photoUrl }} resizeMode="contain" style={styles.photo} /> : null}
      <Text style={styles.stars}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))} · {new Date(review.createdAt).toLocaleDateString(pt ? 'pt-BR' : 'en-US')}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  section: { paddingHorizontal: 18, gap: 12, marginTop: 24 },
  heading: { color: colors.text, fontWeight: '900', fontSize: 23 },
  hint: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  post: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 9 },
  author: { color: colors.text, fontSize: 16, fontWeight: '800' },
  comment: { color: colors.text, lineHeight: 23, fontSize: 15 },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.background, borderRadius: 12 },
  stars: { color: colors.accent, fontSize: 13 },
});
