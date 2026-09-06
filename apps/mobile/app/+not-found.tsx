import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/state';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <Screen contentStyle={styles.content}>
        <EmptyState title="Este caminho não existe" text="O conteúdo pode ter mudado de endereço." action={{ label: 'Ir para o início', onPress: () => router.replace('/(tabs)') }} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({ content: { justifyContent: 'center' } });
