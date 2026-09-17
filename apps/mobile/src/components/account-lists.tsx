import { router } from 'expo-router';
import { ChevronRight, Heart, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { PostImage } from '@/src/components/post-image';
import { ProfileAvatar } from '@/src/components/profile-avatar';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';
import type { NightEvent, Review } from '@/src/types';

export function SavedEventsList({ events }: { events: NightEvent[] }) {
  const { language } = usePreferences();
  return events.length ? <View style={styles.list}>{events.map((event) => (
    <Pressable accessibilityRole="button" key={event.id} onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })} style={styles.eventRow}>
      <View style={styles.eventIcon}><Heart size={17} fill={colors.accent} color={colors.accent} /></View>
      <View style={styles.rowCopy}><Text numberOfLines={2} style={styles.rowTitle}>{event.title}</Text><Text style={styles.rowMeta}>{event.date} · {event.time} · {event.venue}</Text></View>
      <ChevronRight size={19} color={colors.muted} />
    </Pressable>
  ))}</View> : <Text style={styles.emptyText}>{language === 'pt' ? 'Salve eventos na tela Descobrir para vê-los aqui.' : 'Save events on Discover to find them here.'}</Text>;
}

export function AccountPostsList({ reviews }: { reviews: Review[] }) {
  const { profile, user } = useAuth();
  const { deleteReview } = useUserData();
  const { language } = usePreferences();
  const t = copy[language];
  const name = profile?.fullName || user?.email || 'NightGuide';

  function confirmDelete(id: string) {
    Alert.alert(t.deleteTitle, t.deleteText, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => {
        void deleteReview(id).catch(() => Alert.alert(t.error, t.tryAgain));
      } },
    ]);
  }

  if (!reviews.length) return <View style={styles.emptyPosts}><Text style={styles.emptyText}>{t.empty}</Text><Button label={t.firstPost} icon={Plus} variant="secondary" onPress={() => router.push('/account/post' as never)} /></View>;
  return <View style={styles.list}>{reviews.map((review) => (
    <View key={review.id} style={styles.post}>
      <View style={styles.postHeader}>
        <ProfileAvatar name={name} uri={profile?.avatarLocalUri || profile?.avatarUrl} size={40} />
        <View style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{name}</Text><Pressable accessibilityRole="button" accessibilityLabel={review.venue} onPress={() => router.push({ pathname: '/venue/[id]', params: { id: review.venueId } })}><Text numberOfLines={1} style={styles.rowMeta}>📍 {review.venue}</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t.edit} onPress={() => router.push({ pathname: '/account/post', params: { reviewId: review.id } } as never)} style={styles.postAction}><Pencil size={17} color={colors.text} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.delete} onPress={() => confirmDelete(review.id)} style={styles.postAction}><Trash2 size={17} color={colors.rose} /></Pressable>
      </View>
      <Text style={styles.postDescription}>{review.comment}</Text>
      {review.photoUri || review.photoUrl ? <PostImage source={{ uri: review.photoUri || review.photoUrl }} /> : null}
      <View style={styles.postFooter}><Text style={styles.rating}>{'★'.repeat(review.rating)}<Text style={styles.ratingMuted}>{'★'.repeat(5 - review.rating)}</Text></Text><Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</Text></View>
    </View>
  ))}</View>;
}

const copy = {
  pt: { empty: 'Você ainda não publicou nenhuma experiência.', firstPost: 'Fazer primeira publicação', edit: 'Editar publicação', delete: 'Excluir', deleteTitle: 'Excluir publicação?', deleteText: 'Ela será removida agora. Se você estiver offline, a exclusão será sincronizada depois.', cancel: 'Cancelar', error: 'Não foi possível excluir', tryAgain: 'Tente novamente.' },
  en: { empty: 'You have not shared any experiences yet.', firstPost: 'Create your first post', edit: 'Edit post', delete: 'Delete', deleteTitle: 'Delete post?', deleteText: 'It will be removed now. If you are offline, deletion will sync later.', cancel: 'Cancel', error: 'Unable to delete', tryAgain: 'Try again.' },
} as const;

const styles = StyleSheet.create({
  list: { gap: 10 },
  eventRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  eventIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  rowMeta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  emptyPosts: { gap: 12, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  post: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 19, backgroundColor: colors.surface },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13 },
  postAction: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },
  postDescription: { color: colors.text, fontSize: 14, lineHeight: 21, paddingHorizontal: 13, paddingBottom: 13 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13 },
  rating: { color: colors.accent, letterSpacing: 1 },
  ratingMuted: { color: colors.border },
  date: { color: colors.muted, fontSize: 11 },
});
