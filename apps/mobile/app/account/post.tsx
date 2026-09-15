import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Image as ImageIcon, MapPin, MessageSquare, Search, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { PostImage } from '@/src/components/post-image';
import { Screen } from '@/src/components/screen';
import { deletePersistedReviewPhoto, persistReviewPhoto, type LocalReviewPhoto } from '@/src/lib/review-media';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';

type Draft = {
  venueId: string;
  rating: number;
  comment: string;
  photo?: LocalReviewPhoto;
  photoUrl?: string;
};

export default function PostComposerScreen() {
  const params = useLocalSearchParams<{ venueId?: string; reviewId?: string }>();
  const { user } = useAuth();
  const { venues } = useNightData();
  const { reviews, addReview } = useUserData();
  const { language } = usePreferences();
  const t = copy[language];
  const requestedVenueId = first(params.venueId);
  const reviewId = first(params.reviewId);
  const editingReview = reviews.find((review) => review.id === reviewId);
  const draftKey = user ? `nightguide:post-draft:${user.id}` : '';

  const [venueId, setVenueId] = useState(requestedVenueId || venues[0]?.id || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [query, setQuery] = useState('');
  const [photo, setPhoto] = useState<LocalReviewPhoto | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string>();
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace({ pathname: '/auth/login', params: { next: '/account/post' } } as never);
      return;
    }

    if (editingReview) {
      setVenueId(editingReview.venueId);
      setRating(editingReview.rating);
      setComment(editingReview.comment);
      setPhoto(editingReview.photoUri && editingReview.photoMimeType && editingReview.photoFileName
        ? { uri: editingReview.photoUri, mimeType: editingReview.photoMimeType, fileName: editingReview.photoFileName }
        : null);
      setExistingPhotoUrl(editingReview.photoUrl);
      setReady(true);
      return;
    }

    void AsyncStorage.getItem(draftKey).then((raw) => {
      if (raw) {
        try {
          const draft = JSON.parse(raw) as Draft;
          setVenueId(requestedVenueId || draft.venueId || venues[0]?.id || '');
          setRating(draft.rating || 5);
          setComment(draft.comment || '');
          setPhoto(draft.photo || null);
          setExistingPhotoUrl(draft.photoUrl);
        } catch {
          setVenueId(requestedVenueId || venues[0]?.id || '');
        }
      }
      setReady(true);
    });
  }, [draftKey, editingReview?.id, requestedVenueId, user?.id, venues]);

  useEffect(() => {
    if (!ready || !draftKey || editingReview) return;
    const timer = setTimeout(() => {
      const draft: Draft = { venueId, rating, comment, photo: photo || undefined, photoUrl: existingPhotoUrl };
      void AsyncStorage.setItem(draftKey, JSON.stringify(draft));
    }, 250);
    return () => clearTimeout(timer);
  }, [comment, draftKey, editingReview, existingPhotoUrl, photo, rating, ready, venueId]);

  const filteredVenues = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === 'pt' ? 'pt-BR' : 'en-US');
    if (!normalized) return venues.slice(0, 8);
    return venues.filter((venue) => `${venue.name} ${venue.category} ${venue.address}`.toLocaleLowerCase().includes(normalized)).slice(0, 8);
  }, [language, query, venues]);

  async function choosePhoto(source: 'camera' | 'library') {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.permissionTitle, source === 'camera' ? t.cameraPermission : t.galleryPermission);
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.76 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.76 });
      if (result.canceled || !result.assets[0]) return;
      if (photo?.uri && photo.uri !== editingReview?.photoUri) deletePersistedReviewPhoto(photo.uri);
      setPhoto(await persistReviewPhoto(result.assets[0]));
      setExistingPhotoUrl(undefined);
    } catch (error) {
      Alert.alert(t.photoError, error instanceof Error ? error.message : t.tryAgain);
    }
  }

  function removePhoto() {
    if (photo?.uri && photo.uri !== editingReview?.photoUri) deletePersistedReviewPhoto(photo.uri);
    setPhoto(null);
    setExistingPhotoUrl(undefined);
  }

  async function submit() {
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
      if (draftKey) await AsyncStorage.removeItem(draftKey);
      Alert.alert(t.savedTitle, t.savedText, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert(t.saveError, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSending(false);
    }
  }

  const selectedVenue = venues.find((venue) => venue.id === venueId);

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Text style={styles.eyebrow}>{editingReview ? t.editEyebrow : t.createEyebrow}</Text>
        <Text style={styles.title}>{editingReview ? t.editTitle : t.createTitle}</Text>
        <Text style={styles.subtitle}>{editingReview ? t.editSubtitle : t.createSubtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t.place}</Text>
          {editingReview && selectedVenue ? (
            <View style={styles.selectedVenue}>
              <View style={styles.venueIcon}><MapPin size={18} color={colors.accent} /></View>
              <View style={styles.venueCopy}><Text style={styles.venueName}>{selectedVenue.name}</Text><Text style={styles.venueMeta}>{selectedVenue.address}</Text></View>
              <Check size={19} color={colors.accent} />
            </View>
          ) : (
            <>
              <FormField label={t.search} value={query} onChangeText={setQuery} placeholder={t.searchPlaceholder} rightAccessory={<Search size={19} color={colors.muted} />} />
              <View style={styles.venueList}>
                {filteredVenues.map((venue) => {
                  const selected = venue.id === venueId;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={venue.id}
                      onPress={() => setVenueId(venue.id)}
                      style={[styles.venueRow, selected && styles.venueRowSelected]}>
                      <View style={styles.venueCopy}><Text style={styles.venueName}>{venue.name}</Text><Text numberOfLines={1} style={styles.venueMeta}>{venue.category} · {venue.address}</Text></View>
                      {selected ? <Check size={18} color={colors.ink} /> : <MapPin size={18} color={colors.muted} />}
                    </Pressable>
                  );
                })}
                {!filteredVenues.length ? <Text style={styles.empty}>{t.noPlaces}</Text> : null}
              </View>
            </>
          )}

          <Text style={styles.label}>{t.rating}</Text>
          <View accessibilityRole="radiogroup" style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={`${value} ${value === 1 ? t.star : t.stars}`}
                accessibilityState={{ checked: value === rating }}
                key={value}
                onPress={() => setRating(value)}
                style={styles.starButton}>
                <Text style={[styles.star, value <= rating && styles.starActive]}>★</Text>
              </Pressable>
            ))}
          </View>

          <FormField label={t.description} value={comment} onChangeText={setComment} placeholder={t.descriptionPlaceholder} multiline maxLength={500} />
          <Text style={styles.counter}>{comment.length}/500</Text>

          <Text style={styles.label}>{t.photo}</Text>
          <View style={styles.mediaActions}>
            <Button label={t.gallery} icon={ImageIcon} variant="secondary" onPress={() => void choosePhoto('library')} style={styles.mediaButton} />
            <Button label={t.camera} icon={Camera} variant="secondary" onPress={() => void choosePhoto('camera')} style={styles.mediaButton} />
          </View>
          {photo?.uri || existingPhotoUrl ? (
            <View style={styles.preview}>
              <PostImage source={{ uri: photo?.uri || existingPhotoUrl }} rounded />
              <Pressable accessibilityRole="button" accessibilityLabel={t.removePhoto} onPress={removePhoto} style={styles.removePhoto}><Trash2 size={18} color={colors.text} /></Pressable>
            </View>
          ) : null}
          {!editingReview ? <Text style={styles.draftNote}>{t.draft}</Text> : null}
          <Button label={editingReview ? t.save : t.publish} icon={MessageSquare} onPress={() => void submit()} loading={sending} disabled={!ready || !venueId || !comment.trim()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const copy = {
  pt: { createEyebrow: 'COMPARTILHE A EXPERIÊNCIA', editEyebrow: 'SUA PUBLICAÇÃO', createTitle: 'Nova publicação', editTitle: 'Editar publicação', createSubtitle: 'Escolha o local, conte como foi e adicione uma foto se quiser.', editSubtitle: 'Atualize sua descrição, avaliação ou foto.', place: 'Estabelecimento', search: 'Buscar local', searchPlaceholder: 'Nome, categoria ou endereço', noPlaces: 'Nenhum local encontrado.', rating: 'Sua avaliação', star: 'estrela', stars: 'estrelas', description: 'Descrição', descriptionPlaceholder: 'Conte como foi sua experiência nesse local', photo: 'Foto (opcional)', gallery: 'Galeria', camera: 'Câmera', removePhoto: 'Remover foto', draft: 'O rascunho é salvo automaticamente neste aparelho.', save: 'Salvar alterações', publish: 'Publicar', savedTitle: 'Publicação salva', savedText: 'Ela já aparece no seu perfil. Se estiver offline, será enviada quando a internet voltar.', saveError: 'Não foi possível salvar', photoError: 'Não foi possível usar a foto', permissionTitle: 'Permissão necessária', cameraPermission: 'Autorize o acesso à câmera para tirar uma foto.', galleryPermission: 'Autorize o acesso à galeria para escolher uma foto.', tryAgain: 'Tente novamente.' },
  en: { createEyebrow: 'SHARE THE EXPERIENCE', editEyebrow: 'YOUR POST', createTitle: 'New post', editTitle: 'Edit post', createSubtitle: 'Choose a venue, share your experience and add a photo if you like.', editSubtitle: 'Update your description, rating or photo.', place: 'Venue', search: 'Search venues', searchPlaceholder: 'Name, category or address', noPlaces: 'No venues found.', rating: 'Your rating', star: 'star', stars: 'stars', description: 'Description', descriptionPlaceholder: 'Share your experience at this venue', photo: 'Photo (optional)', gallery: 'Gallery', camera: 'Camera', removePhoto: 'Remove photo', draft: 'Your draft is saved automatically on this device.', save: 'Save changes', publish: 'Publish', savedTitle: 'Post saved', savedText: 'It is already visible in your profile. If offline, it will sync when your connection returns.', saveError: 'Unable to save', photoError: 'Unable to use photo', permissionTitle: 'Permission required', cameraPermission: 'Allow camera access to take a photo.', galleryPermission: 'Allow gallery access to choose a photo.', tryAgain: 'Try again.' },
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 10 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 8 },
  title: { color: colors.text, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  card: { gap: 13, marginTop: 22, padding: 17, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  label: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  selectedVenue: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(226,255,84,0.34)', backgroundColor: 'rgba(226,255,84,0.08)' },
  venueIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  venueList: { gap: 8 },
  venueRow: { minHeight: 58, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background },
  venueRowSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  venueCopy: { flex: 1, minWidth: 0 },
  venueName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  venueMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  empty: { color: colors.muted, paddingVertical: 12, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', gap: 4 },
  starButton: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' },
  star: { color: colors.border, fontSize: 32 },
  starActive: { color: colors.accent },
  counter: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: -8 },
  mediaActions: { flexDirection: 'row', gap: 10 },
  mediaButton: { flex: 1 },
  preview: { position: 'relative' },
  removePhoto: { position: 'absolute', top: 9, right: 9, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.86)' },
  draftNote: { color: colors.muted, fontSize: 11, lineHeight: 17 },
});
