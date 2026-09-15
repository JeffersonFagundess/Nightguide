import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { prepareNotifications } from '@/src/lib/notifications';
import { OfflineSyncStatus } from '@/src/components/offline-sync-status';
import { AuthProvider } from '@/src/providers/auth-provider';
import { DataProvider } from '@/src/providers/data-provider';
import { PreferencesProvider } from '@/src/providers/preferences-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { UserDataProvider } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return <PreferencesProvider><AppNavigation /></PreferencesProvider>;
}

function AppNavigation() {
  const { theme, language } = usePreferences();
  const baseTheme = theme === 'dark' ? DarkTheme : DefaultTheme;
  const nightTheme = {
    ...baseTheme,
    dark: theme === 'dark',
    colors: {
      ...baseTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.rose,
    },
  };

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
      <AuthProvider>
          <DataProvider>
            <UserDataProvider>
              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="event/[id]" options={{ title: language === 'pt' ? 'Evento' : 'Event', presentation: 'card' }} />
                <Stack.Screen name="venue/[id]" options={{ title: language === 'pt' ? 'Estabelecimento' : 'Venue', presentation: 'card' }} />
                <Stack.Screen name="checkout/[eventId]" options={{ title: language === 'pt' ? 'Ingresso' : 'Ticket', presentation: 'card' }} />
                <Stack.Screen name="auth/login" options={{ title: language === 'pt' ? 'Entrar' : 'Sign in', presentation: 'modal' }} />
                <Stack.Screen name="auth/register" options={{ title: language === 'pt' ? 'Criar conta' : 'Create account', presentation: 'modal' }} />
                <Stack.Screen name="auth/callback" options={{ title: language === 'pt' ? 'Autenticação' : 'Authentication' }} />
                <Stack.Screen name="auth/reset-password" options={{ title: language === 'pt' ? 'Nova senha' : 'New password', presentation: 'modal' }} />
                <Stack.Screen name="account/post" options={{ title: language === 'pt' ? 'Publicação' : 'Post', presentation: 'modal' }} />
                <Stack.Screen name="account/edit-profile" options={{ title: language === 'pt' ? 'Editar perfil' : 'Edit profile', presentation: 'card' }} />
                <Stack.Screen name="account/settings" options={{ title: language === 'pt' ? 'Configurações' : 'Settings', presentation: 'card' }} />
                <Stack.Screen name="scanner" options={{ title: language === 'pt' ? 'Validar ingresso' : 'Validate ticket', presentation: 'fullScreenModal' }} />
                <Stack.Screen name="owner" options={{ title: language === 'pt' ? 'Painel do estabelecimento' : 'Venue dashboard' }} />
              </Stack>
              <OfflineSyncStatus />
            </UserDataProvider>
          </DataProvider>
        </AuthProvider>
    </ThemeProvider>
  );
}
