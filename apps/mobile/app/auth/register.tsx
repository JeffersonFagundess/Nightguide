import { router } from 'expo-router';
import { Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/src/components/brand';
import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { LanguageSwitch } from '@/src/components/language-switch';
import { Screen } from '@/src/components/screen';
import { ThemeSwitch } from '@/src/components/theme-switch';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function RegisterScreen() {
  const { configured, googleEnabled, register, loginWithGoogle } = useAuth();
  const { language } = usePreferences();
  const t = copy[language];
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', confirm: '' });

  async function submit() {
    setError('');
    setFieldErrors({ name: '', email: '', password: '', confirm: '' });
    if (name.trim().length < 2) return setFieldErrors((current) => ({ ...current, name: t.invalidName }));
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setFieldErrors((current) => ({ ...current, email: t.invalidEmail }));
    if (password.length < 6) return setFieldErrors((current) => ({ ...current, password: t.invalidPassword }));
    if (password !== confirm) return setFieldErrors((current) => ({ ...current, confirm: t.passwordMismatch }));
    setLoading(true);
    try {
      await register({ name, email, password });
      router.dismissAll();
      router.replace('/(tabs)/account');
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
      router.replace('/(tabs)/account');
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
          <FormField label={t.name} value={name} onChangeText={setName} placeholder={t.namePlaceholder} autoComplete="name" error={fieldErrors.name} onFocus={() => setFieldErrors((current) => ({ ...current, name: '' }))} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
          <FormField ref={emailRef} label={t.email} value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" error={fieldErrors.email} onFocus={() => setFieldErrors((current) => ({ ...current, email: '' }))} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
          <FormField ref={passwordRef} label={t.password} value={password} onChangeText={setPassword} placeholder={t.passwordPlaceholder} secureTextEntry={!showPassword} autoComplete="new-password" error={fieldErrors.password} onFocus={() => setFieldErrors((current) => ({ ...current, password: '' }))} rightAccessory={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? t.hidePassword : t.showPassword} onPress={() => setShowPassword((value) => !value)} hitSlop={8}>{showPassword ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}</Pressable>} returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} />
          <FormField ref={confirmRef} label={t.confirm} value={confirm} onChangeText={setConfirm} placeholder={t.confirmPlaceholder} secureTextEntry={!showPassword} autoComplete="new-password" error={fieldErrors.confirm} onFocus={() => setFieldErrors((current) => ({ ...current, confirm: '' }))} returnKeyType="go" onSubmitEditing={() => void submit()} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t.create} icon={UserPlus} onPress={() => void submit()} loading={loading} disabled={!configured} />
        </View>

        {googleEnabled ? (
          <>
            <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t.or}</Text><View style={styles.line} /></View>
            <Button label={t.google} leading={<GoogleMark />} variant="secondary" onPress={() => void google()} loading={googleLoading} />
          </>
        ) : null}
        <View style={styles.alternate}><Text style={styles.alternateText}>{t.hasAccount}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/auth/login')}><Text style={styles.link}>{t.signIn}</Text></Pressable></View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function GoogleMark() {
  return <View style={styles.googleMark}><Text style={styles.googleLetter}>G</Text></View>;
}

const copy = {
  pt: { eyebrow: 'CRIE SEU ROTEIRO', title: 'Abra sua conta', subtitle: 'Cadastro normal com e-mail e senha. Leva menos de um minuto.', name: 'Nome', namePlaceholder: 'Como podemos chamar você?', email: 'E-mail', password: 'Senha', passwordPlaceholder: 'Mínimo de 6 caracteres', showPassword: 'Mostrar senha', hidePassword: 'Ocultar senha', confirm: 'Confirmar senha', confirmPlaceholder: 'Digite a senha novamente', create: 'Criar conta', or: 'ou', google: 'Cadastrar com Google', hasAccount: 'Já tem uma conta?', signIn: 'Entrar', invalidName: 'Digite seu nome.', invalidEmail: 'Digite um e-mail válido.', invalidPassword: 'A senha precisa ter pelo menos 6 caracteres.', passwordMismatch: 'As senhas não são iguais.', genericError: 'Não foi possível criar a conta.', configure: 'Configure as variáveis do Supabase para habilitar login e cadastro.' },
  en: { eyebrow: 'BUILD YOUR NIGHT', title: 'Create your account', subtitle: 'Standard signup with email and password. It takes less than a minute.', name: 'Name', namePlaceholder: 'What should we call you?', email: 'Email', password: 'Password', passwordPlaceholder: 'At least 6 characters', showPassword: 'Show password', hidePassword: 'Hide password', confirm: 'Confirm password', confirmPlaceholder: 'Type your password again', create: 'Create account', or: 'or', google: 'Sign up with Google', hasAccount: 'Already have an account?', signIn: 'Sign in', invalidName: 'Enter your name.', invalidEmail: 'Enter a valid email.', invalidPassword: 'Password must have at least 6 characters.', passwordMismatch: 'Passwords do not match.', genericError: 'Unable to create the account.', configure: 'Configure Supabase environment variables to enable accounts.' },
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preferences: { alignItems: 'flex-end', gap: 7 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginTop: 32 },
  title: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  form: { gap: 14, marginTop: 24 },
  notice: { marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,203,102,0.36)', backgroundColor: 'rgba(255,203,102,0.08)', padding: 13, borderRadius: 13 },
  noticeText: { color: colors.warning, lineHeight: 19, fontSize: 13 },
  error: { color: colors.rose, backgroundColor: 'rgba(255,107,131,0.09)', borderRadius: 12, padding: 12, lineHeight: 19 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 12 },
  alternate: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 24 },
  alternateText: { color: colors.muted },
  link: { color: colors.accent, fontWeight: '900' },
  googleMark: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  googleLetter: { color: '#4285F4', fontWeight: '900', fontSize: 13 },
});
