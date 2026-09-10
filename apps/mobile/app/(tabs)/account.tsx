import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Heart, Image as ImageIcon, LogOut, MessageSquare, Pencil, QrCode, Store, Ticket, Trash2, UserRound, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/src/components/brand';
import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { LanguageSwitch } from '@/src/components/language-switch';
import { Screen } from '@/src/components/screen';
import { LoadingState } from '@/src/components/state';
import { deletePersistedReviewPhoto, persistReviewPhoto, type LocalReviewPhoto } from '@/src/lib/review-media';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function AccountScreen() {
  const params = useLocalSearchParams<{ venueId?: string }>();
  const { ready, configured, user, profile, logout } = useAuth();
  const { events, venues } = useNightData();
  const { favoriteIds, tickets, reviews, addReview } = useUserData();
  const { language } = usePreferences();
  const t = accountCopy[language];
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<LocalReviewPhoto | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>();
  const [editingReviewId, setEditingReviewId] = useState<string>();

  useEffect(() => {
    const requestedVenueId = Array.isArray(params.venueId) ? params.venueId[0] : params.venueId;
    if (requestedVenueId && venues.some((venue) => venue.id === requestedVenueId)) setVenueId(requestedVenueId);
  }, [params.venueId, venues]);

  if (!ready) return <LoadingState label={t.loading} />;

  if (!user) {
    return (
      <Screen contentStyle={styles.guestContent}>
        <View style={styles.guestTop}><Brand /><LanguageSwitch /></View>
        <View style={styles.guestHero}>
          <View style={styles.avatar}><UserRound size={30} color={colors.accent} /></View>
          <Text style={styles.guestTitle}>{t.guestTitle}</Text>
          <Text style={styles.guestText}>{t.guestText}</Text>
        </View>
        {!configured ? <View style={styles.notice}><Text style={styles.noticeText}>{t.configure}</Text></View> : null}
        <Button label={t.signInEmail} onPress={() => router.push('/auth/login')} />
        <Button label={t.createAccount} variant="secondary" onPress={() => router.push('/auth/register')} />
        <View style={styles.guestPublishCard}>
          <View style={styles.guestPublishIcon}><ImageIcon size={22} color={colors.accent} /></View>
          <Text style={styles.guestPublishTitle}>{t.photoPosts}</Text>
          <Text style={styles.guestPublishText}>{t.photoPostsText}</Text>
          <Button label={t.signInPublish} icon={MessageSquare} onPress={() => router.push('/auth/login')} style={styles.guestPublishButton} />
        </View>
      </Screen>
    );
  }

  const savedEvents = events.filter((event) => favoriteIds.includes(event.id));

  async function submitReview() {
    const venue = venues.find((item) => item.id === venueId);
    if (!venue || !comment.trim()) return;
    setSending(true);
    try {
      await addReview({
        venueId: venue.id,
        venue: venue.name,
        rating,
        comment: comment.trim(),
        photoUri: photo?.uri,
        photoMimeType: photo?.mimeType,
        photoFileName: photo?.fileName,
        photoUrl: existingPhotoUrl,
      });
      setComment('');
      setPhoto(null);
      setExistingPhotoUrl(undefined);
      setEditingReviewId(undefined);
      Alert.alert(t.savedTitle, t.savedText);
    } catch (error) {
      Alert.alert(t.saveError, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSending(false);
    }
  }

  async function choosePhoto(source: 'camera' | 'library') {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t.permissionTitle,
          source === 'camera'
            ? t.cameraPermission
            : t.galleryPermission,
        );
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.78 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.78 });

      if (result.canceled || !result.assets[0]) return;
      const editingReview = reviews.find((review) => review.id === editingReviewId);
      if (photo?.uri && photo.uri !== editingReview?.photoUri) deletePersistedReviewPhoto(photo.uri);
      const savedPhoto = await persistReviewPhoto(result.assets[0]);
      setPhoto(savedPhoto);
      setExistingPhotoUrl(undefined);
    } catch (error) {
      Alert.alert(t.photoError, error instanceof Error ? error.message : t.chooseAnother);
    }
  }

  function startEditing(review: (typeof reviews)[number]) {
    setVenueId(review.venueId);
    setRating(review.rating);
    setComment(review.comment);
    setPhoto(
      review.photoUri && review.photoMimeType && review.photoFileName
        ? { uri: review.photoUri, mimeType: review.photoMimeType, fileName: review.photoFileName }
        : null,
    );
    setExistingPhotoUrl(review.photoUrl);
    setEditingReviewId(review.id);
  }

  function cancelEditing() {
    const editingReview = reviews.find((review) => review.id === editingReviewId);
    if (photo?.uri && photo.uri !== editingReview?.photoUri) deletePersistedReviewPhoto(photo.uri);
    setComment('');
    setPhoto(null);
    setExistingPhotoUrl(undefined);
    setEditingReviewId(undefined);
  }

  function removePhoto() {
    const editingReview = reviews.find((review) => review.id === editingReviewId);
    if (photo?.uri && photo.uri !== editingReview?.photoUri) deletePersistedReviewPhoto(photo.uri);
    setPhoto(null);
    setExistingPhotoUrl(undefined);
  }

  return (
    <Screen>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={styles.eyebrow}>{profile?.role === 'owner' ? t.venue : t.myAccount}</Text><Text style={styles.title}>{t.hello}, {profile?.fullName?.split(' ')[0] || 'NightGuide'}</Text></View>
        <LanguageSwitch />
      </View>
      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.metrics}>
        <Metric icon={Heart} label={t.favorites} value={favoriteIds.length} />
        <Metric icon={Ticket} label={t.tickets} value={tickets.length} />
        <Metric icon={MessageSquare} label={t.reviews} value={reviews.length} />
      </View>

      {profile?.role === 'owner' ? (
        <Button label={t.manageVenue} icon={Store} onPress={() => router.push('/owner')} style={styles.ownerButton} />
      ) : null}

      <Section title={t.savedEvents}>
        {savedEvents.length ? savedEvents.map((event) => (
          <Pressable key={event.id} onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })} style={styles.row}>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>{event.title}</Text><Text style={styles.rowMeta}>{event.date} • {event.time} • {event.venue}</Text></View>
            <Text style={styles.rowAction}>{event.price}</Text>
          </Pressable>
        )) : <Text style={styles.emptyText}>{t.savedEventsEmpty}</Text>}
      </Section>

      <Section title={editingReviewId ? t.editPost : t.createPost}>
        <Text style={styles.label}>{t.place}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {venues.map((venue) => <Text key={venue.id} onPress={() => setVenueId(venue.id)} style={[styles.chip, venueId === venue.id && styles.chipActive]}>{venue.name}</Text>)}
        </ScrollView>
        <Text style={styles.label}>{t.rating}</Text>
        <View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((value) => <Text key={value} onPress={() => setRating(value)} style={[styles.ratingChip, value <= rating && styles.ratingActive]}>★</Text>)}</View>
        <FormField label={t.description} placeholder={t.descriptionPlaceholder} value={comment} onChangeText={setComment} multiline maxLength={500} />
        <Text style={styles.label}>{t.optionalPhoto}</Text>
        <View style={styles.mediaActions}>
          <Button label={t.gallery} icon={ImageIcon} variant="secondary" onPress={() => void choosePhoto('library')} style={styles.mediaButton} />
          <Button label={t.camera} icon={Camera} variant="secondary" onPress={() => void choosePhoto('camera')} style={styles.mediaButton} />
        </View>
        {photo?.uri || existingPhotoUrl ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: photo?.uri || existingPhotoUrl }} resizeMode="cover" style={styles.preview} />
            <Pressable accessibilityLabel={t.removePhoto} onPress={removePhoto} style={styles.removePhoto}><Trash2 size={18} color={colors.text} /></Pressable>
          </View>
        ) : null}
        <Button label={editingReviewId ? t.saveChanges : t.publish} icon={MessageSquare} onPress={() => void submitReview()} loading={sending} disabled={!comment.trim()} style={styles.submit} />
        {editingReviewId ? <Button label={t.cancelEdit} icon={X} variant="ghost" onPress={cancelEditing} /> : null}
      </Section>

      {reviews.length ? (
        <Section title={t.myPosts}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.post}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}><UserRound size={19} color={colors.accent} /></View>
                <View style={styles.postHeaderCopy}>
                  <Text style={styles.postAuthor}>{profile?.fullName || 'NightGuide'}</Text>
                  <Text style={styles.postVenue}>📍 {review.venue}</Text>
                </View>
                <Pressable accessibilityLabel={t.editPost} onPress={() => startEditing(review)} style={styles.editPost}>
                  <Pencil size={17} color={colors.text} />
                </Pressable>
              </View>
              <Text style={styles.postDescription}>{review.comment}</Text>
              {review.photoUri || review.photoUrl ? (
                <Image source={{ uri: review.photoUri || review.photoUrl }} resizeMode="cover" style={styles.postImage} />
              ) : null}
              <View style={styles.postFooter}>
                <Text style={styles.postRating}>{'★'.repeat(review.rating)}<Text style={styles.postRatingMuted}>{'★'.repeat(5 - review.rating)}</Text></Text>
                <Text style={styles.postDate}>{new Date(review.createdAt).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</Text>
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {profile?.role === 'owner' ? <Button label={t.openScanner} icon={QrCode} variant="secondary" onPress={() => router.push('/scanner')} /> : null}
      <Button label={t.logout} icon={LogOut} variant="danger" onPress={() => void logout()} style={styles.logout} />
    </Screen>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: number }) {
  return <View style={styles.metric}><Icon size={19} color={colors.accent} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

const accountCopy = {
  pt: { loading: 'Abrindo sua conta…', guestTitle: 'Sua noite, do seu jeito.', guestText: 'Crie uma conta normal usando seu nome, e-mail e senha. O Google fica apenas como uma alternativa.', configure: 'Preencha as variáveis do Supabase para habilitar cadastro e login reais.', signInEmail: 'Entrar com e-mail', createAccount: 'Criar conta', photoPosts: 'Publicações com foto', photoPostsText: 'Depois de entrar, você poderá escolher uma foto da galeria ou tirar uma foto, escrever o comentário e publicar mesmo sem internet.', signInPublish: 'Entrar para publicar', savedTitle: 'Publicação salva', savedText: 'Ela já aparece no seu perfil. Se você estiver offline, será enviada quando a internet voltar.', saveError: 'Não foi possível salvar', tryAgain: 'Tente novamente.', permissionTitle: 'Permissão necessária', cameraPermission: 'Autorize o acesso à câmera para tirar uma foto.', galleryPermission: 'Autorize o acesso à galeria para escolher uma foto.', photoError: 'Não foi possível usar a foto', chooseAnother: 'Tente escolher outra imagem.', venue: 'ESTABELECIMENTO', myAccount: 'MINHA CONTA', hello: 'Olá', favorites: 'Favoritos', tickets: 'Ingressos', reviews: 'Avaliações', manageVenue: 'Gerenciar estabelecimento', savedEvents: 'Eventos salvos', savedEventsEmpty: 'Salve eventos na tela Descobrir para vê-los aqui.', editPost: 'Editar publicação', createPost: 'Criar publicação', place: 'Local', rating: 'Nota', description: 'Descrição', descriptionPlaceholder: 'Conte como foi sua experiência nesse local', optionalPhoto: 'Foto (opcional)', gallery: 'Galeria', camera: 'Câmera', removePhoto: 'Remover foto', saveChanges: 'Salvar alterações', publish: 'Publicar', cancelEdit: 'Cancelar edição', myPosts: 'Minhas publicações', openScanner: 'Abrir scanner de ingressos', logout: 'Sair da conta' },
  en: { loading: 'Opening your account…', guestTitle: 'Your night, your way.', guestText: 'Create an account with your name, email and password. Google remains an optional alternative.', configure: 'Add the Supabase environment variables to enable real sign-up and sign-in.', signInEmail: 'Sign in with email', createAccount: 'Create account', photoPosts: 'Photo posts', photoPostsText: 'After signing in, you can choose a gallery photo or take one, write your review and publish even while offline.', signInPublish: 'Sign in to post', savedTitle: 'Post saved', savedText: 'It is already visible in your profile. If you are offline, it will be sent when the connection returns.', saveError: 'Unable to save', tryAgain: 'Try again.', permissionTitle: 'Permission required', cameraPermission: 'Allow camera access to take a photo.', galleryPermission: 'Allow gallery access to choose a photo.', photoError: 'Unable to use photo', chooseAnother: 'Try another image.', venue: 'VENUE', myAccount: 'MY ACCOUNT', hello: 'Hello', favorites: 'Favorites', tickets: 'Tickets', reviews: 'Reviews', manageVenue: 'Manage venue', savedEvents: 'Saved events', savedEventsEmpty: 'Save events on Discover to see them here.', editPost: 'Edit post', createPost: 'Create post', place: 'Venue', rating: 'Rating', description: 'Description', descriptionPlaceholder: 'Share your experience at this venue', optionalPhoto: 'Photo (optional)', gallery: 'Gallery', camera: 'Camera', removePhoto: 'Remove photo', saveChanges: 'Save changes', publish: 'Publish', cancelEdit: 'Cancel editing', myPosts: 'My posts', openScanner: 'Open ticket scanner', logout: 'Sign out' },
} as const;

const styles = StyleSheet.create({
  guestContent: { justifyContent: 'center', gap: 12 },
  guestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headingCopy: { flex: 1 },
  guestHero: { marginTop: 26, marginBottom: 12 },
  avatar: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  guestTitle: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 20 },
  guestText: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 11 },
  guestPublishCard: { marginTop: 14, padding: 16, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  guestPublishIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  guestPublishTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 12 },
  guestPublishText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  guestPublishButton: { marginTop: 13 },
  notice: { borderWidth: 1, borderColor: 'rgba(255,203,102,0.4)', backgroundColor: 'rgba(255,203,102,0.08)', padding: 13, borderRadius: 13, marginBottom: 4 },
  noticeText: { color: colors.warning, fontSize: 13, lineHeight: 19 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 14 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  email: { color: colors.muted, marginTop: 5 },
  metrics: { flexDirection: 'row', gap: 10, marginTop: 22 },
  metric: { flex: 1, minHeight: 108, padding: 13, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 8 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  ownerButton: { marginTop: 14 },
  section: { marginTop: 22, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  sectionBody: { gap: 12, marginTop: 14 },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  rowAction: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  chips: { gap: 8 },
  chip: { overflow: 'hidden', color: colors.muted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  chipActive: { color: colors.ink, backgroundColor: colors.accent, borderColor: colors.accent, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', gap: 5 },
  ratingChip: { color: colors.border, fontSize: 30 },
  ratingActive: { color: colors.accent },
  mediaActions: { flexDirection: 'row', gap: 10 },
  mediaButton: { flex: 1 },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 15, backgroundColor: colors.elevated },
  removePhoto: { position: 'absolute', top: 9, right: 9, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.82)' },
  submit: { marginTop: 2 },
  post: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.background },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  postHeaderCopy: { flex: 1 },
  postAuthor: { color: colors.text, fontWeight: '900', fontSize: 14 },
  postVenue: { color: colors.muted, fontSize: 12, marginTop: 2 },
  editPost: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },
  postDescription: { color: colors.text, fontSize: 14, lineHeight: 21, paddingHorizontal: 13, paddingBottom: 13 },
  postImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.elevated },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13 },
  postRating: { color: colors.accent, letterSpacing: 1 },
  postRatingMuted: { color: colors.border },
  postDate: { color: colors.muted, fontSize: 11 },
  logout: { marginTop: 18 },
});
