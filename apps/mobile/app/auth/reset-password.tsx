import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { Screen } from '@/src/components/screen';
import { LoadingState } from '@/src/components/state';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { updatePassword } = useAuth();
  const { language } = usePreferences();
  const t = copy[language];
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function prepare() {
      if (params.error_description) throw new Error(params.error_description);
      if (!supabase) throw new Error(t.invalidLink);
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error(t.invalidLink);
      setReady(true);
    }
    void prepare().catch((error) => setLinkError(error instanceof Error ? error.message : t.invalidLink));
  }, [params.code, params.error_description, t.invalidLink]);

  async function save() {
    if (password.length < 6 || password !== confirm) return;
    setSaving(true);
    try {
      await updatePassword(password);
      Alert.alert(t.saved, t.savedText, [{ text: 'OK', onPress: () => router.replace('/(tabs)/account') }]);
    } catch (error) {
      Alert.alert(t.error, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSaving(false);
    }
  }

  if (!ready && !linkError) return <LoadingState label={t.checking} />;

  if (linkError) {
    return <Screen contentStyle={styles.center}><KeyRound size={34} color={colors.rose} /><Text style={styles.title}>{t.linkTitle}</Text><Text style={styles.subtitle}>{linkError}</Text><Button label={t.back} variant="secondary" onPress={() => router.replace('/auth/login')} /></Screen>;
  }

  const passwordError = password.length > 0 && password.length < 6 ? t.invalidPassword : undefined;
  const confirmError = confirm.length > 0 && password !== confirm ? t.mismatch : undefined;

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>{t.eyebrow}</Text>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>
      <View style={styles.form}>
        <FormField label={t.password} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="new-password" placeholder={t.passwordPlaceholder} error={passwordError} rightAccessory={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? t.hide : t.show} onPress={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}</Pressable>} />
        <FormField label={t.confirm} value={confirm} onChangeText={setConfirm} secureTextEntry={!showPassword} autoComplete="new-password" placeholder={t.confirmPlaceholder} error={confirmError} />
        <Button label={t.save} icon={KeyRound} onPress={() => void save()} loading={saving} disabled={password.length < 6 || password !== confirm} />
      </View>
    </Screen>
  );
}

const copy = {
  pt: { checking: 'Verificando o link…', invalidLink: 'Este link é inválido ou expirou. Solicite outro pelo login.', linkTitle: 'Link indisponível', back: 'Voltar para o login', eyebrow: 'SEGURANÇA', title: 'Crie uma nova senha', subtitle: 'Use pelo menos 6 caracteres e guarde sua senha em um local seguro.', password: 'Nova senha', passwordPlaceholder: 'Mínimo de 6 caracteres', confirm: 'Confirmar nova senha', confirmPlaceholder: 'Digite novamente', show: 'Mostrar senha', hide: 'Ocultar senha', invalidPassword: 'Use pelo menos 6 caracteres.', mismatch: 'As senhas não são iguais.', save: 'Salvar nova senha', saved: 'Senha alterada', savedText: 'Sua nova senha já pode ser usada.', error: 'Não foi possível alterar', tryAgain: 'Tente novamente.' },
  en: { checking: 'Checking the link…', invalidLink: 'This link is invalid or expired. Request another one from sign in.', linkTitle: 'Link unavailable', back: 'Back to sign in', eyebrow: 'SECURITY', title: 'Create a new password', subtitle: 'Use at least 6 characters and keep your password somewhere safe.', password: 'New password', passwordPlaceholder: 'At least 6 characters', confirm: 'Confirm new password', confirmPlaceholder: 'Type it again', show: 'Show password', hide: 'Hide password', invalidPassword: 'Use at least 6 characters.', mismatch: 'Passwords do not match.', save: 'Save new password', saved: 'Password changed', savedText: 'You can now use your new password.', error: 'Unable to change password', tryAgain: 'Try again.' },
} as const;

const styles = StyleSheet.create({
  content: { paddingTop: 24 },
  center: { justifyContent: 'center', gap: 14 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  form: { gap: 14, marginTop: 25, padding: 17, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
});
