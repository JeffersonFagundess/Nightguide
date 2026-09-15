import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff, LogIn } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/src/components/brand';
import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { LanguageSwitch } from '@/src/components/language-switch';
import { Screen } from '@/src/components/screen';
import { ThemeSwitch } from '@/src/components/theme-switch';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { configured, googleEnabled, login, loginWithGoogle, requestPasswordReset } = useAuth();
  const { language } = usePreferences();
  const t = copy[language];
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function submit() {
    setError('');
    setEmailError('');
    setPasswordError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailError(t.invalidEmail);
    if (password.length < 6) return setPasswordError(t.invalidPassword);
    setLoading(true);
    try {
      await login(email, password);
      router.dismissAll();
      router.replace(safeNext(next) as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setEmailError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError(t.enterEmailFirst);
      return;
    }
    try {
      await requestPasswordReset(email);
      Alert.alert(t.resetSent, t.resetSentText);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.resetError);
    }
  }

  async function google() {
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      router.dismissAll();
      router.replace(safeNext(next) as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.genericError);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.top}><Brand compact /><View style={styles.preferences}><ThemeSwitch /><LanguageSwitch /></View></View>
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
            error={emailError}
            onFocus={() => setEmailError('')}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <FormField
            ref={passwordRef}
            label={t.password}
            value={password}
            onChangeText={setPassword}
            placeholder={t.passwordPlaceholder}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            error={passwordError}
            onFocus={() => setPasswordError('')}
            rightAccessory={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? t.hidePassword : t.showPassword} onPress={() => setShowPassword((value) => !value)} hitSlop={8}>{showPassword ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}</Pressable>}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          <Pressable accessibilityRole="button" onPress={() => void forgotPassword()} style={styles.forgot}><Text style={styles.forgotText}>{t.forgot}</Text></Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t.signIn} icon={LogIn} onPress={() => void submit()} loading={loading} disabled={!configured} />
        </View>

        {googleEnabled ? (
          <>
            <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t.or}</Text><View style={styles.line} /></View>
            <Button label={t.google} leading={<GoogleMark />} variant="secondary" onPress={() => void google()} loading={googleLoading} />
          </>
        ) : null}

        <View style={styles.alternate}><Text style={styles.alternateText}>{t.noAccount}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/auth/register')}><Text style={styles.link}>{t.create}</Text></Pressable></View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function GoogleMark() {
  return <View style={styles.googleMark}><Text style={styles.googleLetter}>G</Text></View>;
}

function safeNext(value?: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? (value as never) : '/(tabs)/account';
}

const copy = {
  pt: { eyebrow: 'BEM-VINDO DE VOLTA', title: 'Entre no NightGuide', subtitle: 'Use seu e-mail e senha. O Google é só uma alternativa.', email: 'E-mail', password: 'Senha', passwordPlaceholder: 'Mínimo de 6 caracteres', showPassword: 'Mostrar senha', hidePassword: 'Ocultar senha', forgot: 'Esqueci minha senha', enterEmailFirst: 'Digite seu e-mail para recuperar a senha.', resetSent: 'Confira seu e-mail', resetSentText: 'Enviamos um link para você criar uma nova senha.', resetError: 'Não foi possível enviar o link.', signIn: 'Entrar', or: 'ou', google: 'Continuar com Google', noAccount: 'Ainda não tem conta?', create: 'Criar conta', invalidEmail: 'Digite um e-mail válido.', invalidPassword: 'A senha precisa ter pelo menos 6 caracteres.', genericError: 'Não foi possível entrar.', configure: 'Configure as variáveis do Supabase para habilitar login e cadastro.' },
  en: { eyebrow: 'WELCOME BACK', title: 'Sign in to NightGuide', subtitle: 'Use your email and password. Google is only an alternative.', email: 'Email', password: 'Password', passwordPlaceholder: 'At least 6 characters', showPassword: 'Show password', hidePassword: 'Hide password', forgot: 'Forgot my password', enterEmailFirst: 'Enter your email to reset your password.', resetSent: 'Check your email', resetSentText: 'We sent you a link to create a new password.', resetError: 'Unable to send the reset link.', signIn: 'Sign in', or: 'or', google: 'Continue with Google', noAccount: "Don't have an account?", create: 'Create account', invalidEmail: 'Enter a valid email.', invalidPassword: 'Password must have at least 6 characters.', genericError: 'Unable to sign in.', configure: 'Configure Supabase environment variables to enable accounts.' },
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preferences: { alignItems: 'flex-end', gap: 7 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginTop: 36 },
  title: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  form: { gap: 14, marginTop: 26 },
  notice: { marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,203,102,0.36)', backgroundColor: 'rgba(255,203,102,0.08)', padding: 13, borderRadius: 13 },
  noticeText: { color: colors.warning, lineHeight: 19, fontSize: 13 },
  error: { color: colors.rose, backgroundColor: 'rgba(255,107,131,0.09)', borderRadius: 12, padding: 12, lineHeight: 19 },
  forgot: { alignSelf: 'flex-end', minHeight: 38, justifyContent: 'center', marginTop: -7 },
  forgotText: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 12 },
  alternate: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 24 },
  alternateText: { color: colors.muted },
  link: { color: colors.accent, fontWeight: '900' },
  googleMark: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  googleLetter: { color: '#4285F4', fontWeight: '900', fontSize: 13 },
});
