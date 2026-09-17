import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { ProfileAvatar } from '@/src/components/profile-avatar';
import { Screen } from '@/src/components/screen';
import { deletePersistedReviewPhoto, persistReviewPhoto, type LocalReviewPhoto } from '@/src/lib/review-media';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function EditProfileScreen() {
  const { user, profile, updateProfile } = useAuth();
  const { language } = usePreferences();
  const t = copy[language];
  const [name, setName] = useState(profile?.fullName || '');
  const [photo, setPhoto] = useState<LocalReviewPhoto | null>(null);
  const [cover, setCover] = useState<LocalReviewPhoto | null>(null);
  const [bio, setBio] = useState(profile?.bio || '');
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user]);

  async function choosePhoto(kind: 'avatar' | 'cover') {
    if (choosing || saving) return;
    setChoosing(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.permissionTitle, t.permissionText);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: kind === 'avatar' ? [1, 1] : [16, 9], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const selected = await persistReviewPhoto(result.assets[0]);
      const previous = kind === 'avatar' ? photo : cover;
      if (previous?.uri && previous.uri !== profile?.avatarLocalUri && previous.uri !== profile?.coverLocalUri) deletePersistedReviewPhoto(previous.uri);
      if (kind === 'avatar') setPhoto(selected);
      else setCover(selected);
    } catch (error) {
      Alert.alert(t.photoError, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setChoosing(false);
    }
  }

  async function save() {
    if (saving || choosing || name.trim().length < 2) return;
    setSaving(true);
    try {
      const result = await updateProfile({ fullName: name, bio, avatarPhoto: photo || undefined, coverPhoto: cover || undefined });
      Alert.alert(result.synced ? t.saved : t.pending, result.synced ? t.savedText : result.error ? `${t.pendingError}\n${result.error}` : t.pendingText, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert(t.error, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSaving(false);
    }
  }

  const previewUri = photo?.uri || profile?.avatarLocalUri || profile?.avatarUrl;
  const coverUri = cover?.uri || profile?.coverLocalUri || profile?.coverUrl;

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>{t.eyebrow}</Text>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.changeCover} disabled={choosing || saving} onPress={() => void choosePhoto('cover')} style={styles.cover}>
          {coverUri ? <Image source={{ uri: coverUri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <ImagePlus size={32} color={colors.accent} />}
          <View style={styles.coverLabel}><Camera size={16} color="#FFFFFF" /><Text style={styles.coverText}>{t.changeCover}</Text></View>
        </Pressable>
        <View style={styles.avatarWrap}>
          <ProfileAvatar name={name || profile?.fullName} uri={previewUri} size={104} />
          <Pressable accessibilityRole="button" accessibilityLabel={t.changePhoto} disabled={choosing || saving} onPress={() => void choosePhoto('avatar')} style={styles.cameraButton}><Camera size={20} color={colors.ink} /></Pressable>
        </View>
        <Button label={t.changePhoto} icon={Camera} variant="secondary" disabled={choosing || saving} onPress={() => void choosePhoto('avatar')} />
        <FormField label={t.name} value={name} onChangeText={setName} editable={!saving} placeholder={t.namePlaceholder} autoComplete="name" maxLength={80} error={name.length > 0 && name.trim().length < 2 ? t.invalidName : undefined} />
        <FormField label={t.bio} value={bio} onChangeText={setBio} editable={!saving} placeholder={t.bioPlaceholder} multiline maxLength={300} />
        <Text style={styles.counter}>{bio.length}/300</Text>
        <View style={styles.emailBox}><Text style={styles.emailLabel}>{t.email}</Text><Text numberOfLines={1} style={styles.email}>{user?.email}</Text><Text style={styles.emailHint}>{t.emailHint}</Text></View>
        <Button label={t.save} icon={Save} onPress={() => void save()} loading={saving} disabled={choosing || name.trim().length < 2} />
        <Text style={styles.offlineNote}>{t.offline}</Text>
      </View>
    </Screen>
  );
}

const copy = {
  pt: { eyebrow: 'SEU PERFIL', title: 'Editar perfil', subtitle: 'Sua foto, sua capa e um pouco sobre você.', changePhoto: 'Alterar foto', changeCover: 'Escolher capa', bio: 'Descrição', bioPlaceholder: 'Conte um pouco sobre você e os lugares que gosta de explorar…', name: 'Nome', namePlaceholder: 'Seu nome', invalidName: 'Digite pelo menos 2 caracteres.', email: 'E-mail da conta', emailHint: 'O e-mail de acesso não é alterado nesta tela.', save: 'Salvar perfil', offline: 'Sem internet? Seu perfil fica salvo no aparelho e será enviado quando a conexão voltar.', saved: 'Perfil atualizado', savedText: 'Foto, capa e descrição salvas na sua conta.', pending: 'Salvo no aparelho', pendingText: 'Seu perfil já foi atualizado aqui. As mudanças serão enviadas quando a internet voltar.', pendingError: 'Seu perfil foi salvo neste aparelho, mas o envio não foi concluído. A alteração continua pendente para uma nova tentativa.', photoError: 'Não foi possível usar a foto', error: 'Não foi possível salvar', tryAgain: 'Tente novamente.', permissionTitle: 'Permissão necessária', permissionText: 'Autorize o acesso à galeria para escolher sua foto ou capa.' },
  en: { eyebrow: 'YOUR PROFILE', title: 'Edit profile', subtitle: 'Your photo, your cover and a little about you.', changePhoto: 'Change photo', changeCover: 'Choose cover', bio: 'About you', bioPlaceholder: 'Share a little about yourself and the places you like to explore…', name: 'Name', namePlaceholder: 'Your name', invalidName: 'Enter at least 2 characters.', email: 'Account email', emailHint: 'Your sign-in email cannot be changed here.', save: 'Save profile', offline: 'No internet? Your profile stays saved on this device and syncs when you reconnect.', saved: 'Profile updated', savedText: 'Photo, cover and description saved to your account.', pending: 'Saved on this device', pendingText: 'Your profile is already updated here. Changes will sync when your connection returns.', pendingError: 'Your profile is saved on this device, but the upload did not complete. The change is still pending for another attempt.', photoError: 'Unable to use photo', error: 'Unable to save', tryAgain: 'Try again.', permissionTitle: 'Permission required', permissionText: 'Allow gallery access to choose your photo or cover.' },
} as const;

const styles = StyleSheet.create({
  content: { paddingTop: 10 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 8 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  card: { gap: 16, marginTop: 22, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center' },
  coverLabel: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.72)' },
  coverText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  counter: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: -10 },
  avatarWrap: { alignSelf: 'center', position: 'relative', marginTop: -46, borderWidth: 4, borderColor: colors.surface, borderRadius: 60 },
  cameraButton: { position: 'absolute', right: -3, bottom: -3, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surface },
  emailBox: { padding: 14, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  emailLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  email: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 5 },
  emailHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  offlineNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
