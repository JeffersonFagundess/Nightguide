import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/screen';
import { LoadingState } from '@/src/components/state';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';
import { usePreferences } from '@/src/providers/preferences-provider';

export default function AuthCallbackScreen() {
  const { code, error_description: errorDescription, next } = useLocalSearchParams<{ code?: string; error_description?: string; next?: string }>();
  const [error, setError] = useState('');
  const { language } = usePreferences();
  const pt = language === 'pt';

  useEffect(() => {
    async function finish() {
      if (errorDescription) throw new Error(errorDescription);
      if (!supabase || !code) throw new Error(pt ? 'Link de confirmação inválido ou expirado.' : 'Invalid or expired confirmation link.');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      router.replace((next === '/auth/reset-password' ? '/auth/reset-password' : '/(tabs)/account') as never);
    }
    void finish().catch((nextError) => setError(nextError instanceof Error ? nextError.message : (pt ? 'Falha na autenticação.' : 'Authentication failed.')));
  }, [code, errorDescription, next, pt]);

  if (!error) return <LoadingState label={pt ? 'Confirmando sua conta…' : 'Confirming your account…'} />;
  return <Screen contentStyle={styles.content}><Text style={styles.title}>{pt ? 'Não foi possível confirmar' : 'Unable to confirm'}</Text><Text style={styles.text}>{error}</Text><Text onPress={() => router.replace('/auth/login')} style={styles.link}>{pt ? 'Voltar para o login' : 'Back to sign in'}</Text></Screen>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  text: { color: colors.muted, lineHeight: 21, marginTop: 10 },
  link: { color: colors.accent, fontWeight: '900', marginTop: 20 },
});
