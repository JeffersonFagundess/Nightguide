import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/state';
import { usePreferences } from '@/src/providers/preferences-provider';

export default function NotFoundScreen() {
  const { language } = usePreferences();
  const pt = language === 'pt';
  return (
    <>
      <Stack.Screen options={{ title: pt ? 'Página não encontrada' : 'Page not found' }} />
      <Screen contentStyle={styles.content}>
        <EmptyState title={pt ? 'Este caminho não existe' : 'This page does not exist'} text={pt ? 'O conteúdo pode ter mudado de endereço.' : 'The content may have moved.'} action={{ label: pt ? 'Ir para o início' : 'Go home', onPress: () => router.replace('/(tabs)') }} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({ content: { justifyContent: 'center' } });
