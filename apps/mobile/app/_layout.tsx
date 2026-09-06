import * as Notifications from 'expo-notifications';
import { DarkTheme, Stack, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { prepareNotifications } from '@/src/lib/notifications';
import { OfflineSyncStatus } from '@/src/components/offline-sync-status';
import { AuthProvider } from '@/src/providers/auth-provider';
import { DataProvider } from '@/src/providers/data-provider';
import { PreferencesProvider } from '@/src/providers/preferences-provider';
import { UserDataProvider } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

const nightTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.rose,
  },
};

export default function RootLayout() {
  useEffect(() => {
    void prepareNotifications();
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) router.push(route as never);
    });
    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider value={nightTheme}>
      <PreferencesProvider>
        <AuthProvider>
          <DataProvider>
            <UserDataProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="event/[id]" options={{ title: 'Evento', presentation: 'card' }} />
                <Stack.Screen name="venue/[id]" options={{ title: 'Estabelecimento', presentation: 'card' }} />
                <Stack.Screen name="checkout/[eventId]" options={{ title: 'Ingresso', presentation: 'card' }} />
                <Stack.Screen name="auth/login" options={{ title: 'Entrar', presentation: 'modal' }} />
                <Stack.Screen name="auth/register" options={{ title: 'Criar conta', presentation: 'modal' }} />
                <Stack.Screen name="auth/callback" options={{ title: 'Autenticação' }} />
                <Stack.Screen name="scanner" options={{ title: 'Validar ingresso', presentation: 'fullScreenModal' }} />
                <Stack.Screen name="owner" options={{ title: 'Painel do estabelecimento' }} />
              </Stack>
              <OfflineSyncStatus />
            </UserDataProvider>
          </DataProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
