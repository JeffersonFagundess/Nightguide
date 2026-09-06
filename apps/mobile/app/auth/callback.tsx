import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/screen';
import { LoadingState } from '@/src/components/state';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';

export default function AuthCallbackScreen() {
  const { code, error_description: errorDescription } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [error, setError] = useState('');

  useEffect(() => {
    async function finish() {
      if (errorDescription) throw new Error(errorDescription);
      if (!supabase || !code) throw new Error('Link de confirmação inválido ou expirado.');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      router.replace('/(tabs)/account');
    }
    void finish().catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Falha na autenticação.'));
  }, [code, errorDescription]);

  if (!error) return <LoadingState label="Confirmando sua conta…" />;
  return <Screen contentStyle={styles.content}><Text style={styles.title}>Não foi possível confirmar</Text><Text style={styles.text}>{error}</Text><Text onPress={() => router.replace('/auth/login')} style={styles.link}>Voltar para o login</Text></Screen>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  text: { color: colors.muted, lineHeight: 21, marginTop: 10 },
  link: { color: colors.accent, fontWeight: '900', marginTop: 20 },
});
