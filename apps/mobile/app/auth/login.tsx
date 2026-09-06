import { router, useLocalSearchParams } from 'expo-router';
import { Globe2, LogIn } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/src/components/brand';
import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { LanguageSwitch } from '@/src/components/language-switch';
import { Screen } from '@/src/components/screen';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { configured, googleEnabled, login, loginWithGoogle } = useAuth();
  const { language } = usePreferences();
  const t = copy[language];
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t.invalidEmail);
    if (password.length < 6) return setError(t.invalidPassword);
    setLoading(true);
    try {
      await login(email, password);
      router.dismissAll();
      router.replace(safeNext(next));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      router.dismissAll();
      router.replace(safeNext(next));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.genericError);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.top}><Brand compact /><LanguageSwitch /></View>
        <Text style={styles.eyebrow}>{t.eyebrow}</Text>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        {!configured ? <View style={styles.notice}><Text style={styles.noticeText}>{t.configure}</Text></View> : null}
        <View style={styles.form}>
          <FormField
            label={t.email}
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <FormField
            ref={passwordRef}
            label={t.password}
            value={password}
            onChangeText={setPassword}
            placeholder={t.passwordPlaceholder}
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t.signIn} icon={LogIn} onPress={() => void submit()} loading={loading} disabled={!configured} />
        </View>

        {googleEnabled ? (
          <>
            <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t.or}</Text><View style={styles.line} /></View>
            <Button label={t.google} icon={Globe2} variant="secondary" onPress={() => void google()} loading={googleLoading} />
          </>
        ) : null}

        <Text style={styles.alternate}>{t.noAccount} <Text style={styles.link} onPress={() => router.replace('/auth/register')}>{t.create}</Text></Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function safeNext(value?: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? (value as never) : '/(tabs)/account';
}

const copy = {
  pt: { eyebrow: 'BEM-VINDO DE VOLTA', title: 'Entre no NightGuide', subtitle: 'Use seu e-mail e senha. O Google é só uma alternativa.', email: 'E-mail', password: 'Senha', passwordPlaceholder: 'Mínimo de 6 caracteres', signIn: 'Entrar', or: 'ou', google: 'Continuar com Google', noAccount: 'Ainda não tem conta?', create: 'Criar conta', invalidEmail: 'Digite um e-mail válido.', invalidPassword: 'A senha precisa ter pelo menos 6 caracteres.', genericError: 'Não foi possível entrar.', configure: 'Configure as variáveis do Supabase para habilitar login e cadastro.' },
  en: { eyebrow: 'WELCOME BACK', title: 'Sign in to NightGuide', subtitle: 'Use your email and password. Google is only an alternative.', email: 'Email', password: 'Password', passwordPlaceholder: 'At least 6 characters', signIn: 'Sign in', or: 'or', google: 'Continue with Google', noAccount: "Don't have an account?", create: 'Create account', invalidEmail: 'Enter a valid email.', invalidPassword: 'Password must have at least 6 characters.', genericError: 'Unable to sign in.', configure: 'Configure Supabase environment variables to enable accounts.' },
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginTop: 36 },
  title: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  form: { gap: 14, marginTop: 26 },
  notice: { marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,203,102,0.36)', backgroundColor: 'rgba(255,203,102,0.08)', padding: 13, borderRadius: 13 },
  noticeText: { color: colors.warning, lineHeight: 19, fontSize: 13 },
  error: { color: colors.rose, backgroundColor: 'rgba(255,107,131,0.09)', borderRadius: 12, padding: 12, lineHeight: 19 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 12 },
  alternate: { color: colors.muted, textAlign: 'center', marginTop: 24 },
  link: { color: colors.accent, fontWeight: '900' },
});
