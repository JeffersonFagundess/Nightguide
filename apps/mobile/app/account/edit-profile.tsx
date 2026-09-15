import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user]);

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.permissionTitle, t.permissionText);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.72 });
    if (result.canceled || !result.assets[0]) return;
    if (photo?.uri) deletePersistedReviewPhoto(photo.uri);
    setPhoto(await persistReviewPhoto(result.assets[0]));
  }

  async function save() {
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await updateProfile({ fullName: name, avatarPhoto: photo || undefined, avatarUrl: photo ? undefined : profile?.avatarUrl });
      Alert.alert(t.saved, t.savedText, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert(t.error, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSaving(false);
    }
  }

  const previewUri = photo?.uri || profile?.avatarUrl;

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>{t.eyebrow}</Text>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          <ProfileAvatar name={name || profile?.fullName} uri={previewUri} size={104} />
          <Pressable accessibilityRole="button" accessibilityLabel={t.changePhoto} onPress={() => void choosePhoto()} style={styles.cameraButton}><Camera size={20} color={colors.ink} /></Pressable>
        </View>
        <Button label={t.changePhoto} icon={Camera} variant="secondary" onPress={() => void choosePhoto()} />
        <FormField label={t.name} value={name} onChangeText={setName} placeholder={t.namePlaceholder} autoComplete="name" maxLength={80} error={name.length > 0 && name.trim().length < 2 ? t.invalidName : undefined} />
        <View style={styles.emailBox}><Text style={styles.emailLabel}>{t.email}</Text><Text numberOfLines={1} style={styles.email}>{user?.email}</Text><Text style={styles.emailHint}>{t.emailHint}</Text></View>
        <Button label={t.save} icon={Save} onPress={() => void save()} loading={saving} disabled={name.trim().length < 2} />
        <Text style={styles.offlineNote}>{t.offline}</Text>
      </View>
    </Screen>
  );
}

const copy = {
  pt: { eyebrow: 'SEU PERFIL', title: 'Editar perfil', subtitle: 'Escolha como seu nome e sua foto aparecem nas publicações.', changePhoto: 'Alterar foto', name: 'Nome', namePlaceholder: 'Seu nome', invalidName: 'Digite pelo menos 2 caracteres.', email: 'E-mail da conta', emailHint: 'O e-mail de acesso não é alterado nesta tela.', save: 'Salvar perfil', offline: 'Se você estiver offline, a alteração ficará pendente e será enviada quando a conexão voltar.', saved: 'Perfil salvo', savedText: 'Suas informações foram atualizadas.', error: 'Não foi possível salvar', tryAgain: 'Tente novamente.', permissionTitle: 'Permissão necessária', permissionText: 'Autorize o acesso à galeria para escolher sua foto de perfil.' },
  en: { eyebrow: 'YOUR PROFILE', title: 'Edit profile', subtitle: 'Choose how your name and photo appear in posts.', changePhoto: 'Change photo', name: 'Name', namePlaceholder: 'Your name', invalidName: 'Enter at least 2 characters.', email: 'Account email', emailHint: 'Your sign-in email cannot be changed here.', save: 'Save profile', offline: 'If you are offline, this change will remain pending and sync when your connection returns.', saved: 'Profile saved', savedText: 'Your information has been updated.', error: 'Unable to save', tryAgain: 'Try again.', permissionTitle: 'Permission required', permissionText: 'Allow gallery access to choose your profile photo.' },
} as const;

const styles = StyleSheet.create({
  content: { paddingTop: 10 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 8 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  card: { gap: 16, marginTop: 22, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  avatarWrap: { alignSelf: 'center', position: 'relative', marginVertical: 5 },
  cameraButton: { position: 'absolute', right: -3, bottom: -3, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surface },
  emailBox: { padding: 14, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  emailLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  email: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 5 },
  emailHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  offlineNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
