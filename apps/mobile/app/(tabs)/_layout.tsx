import { Tabs } from 'expo-router';
import { Compass, MapPinned, Ticket, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '@/src/providers/preferences-provider';

import { colors } from '@/src/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { language } = usePreferences();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '800' },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen name="index" options={{ title: language === 'pt' ? 'Descobrir' : 'Discover', tabBarIcon: ({ color }) => <Compass color={color} size={23} /> }} />
      <Tabs.Screen name="map" options={{ title: language === 'pt' ? 'Mapa' : 'Map', tabBarIcon: ({ color }) => <MapPinned color={color} size={23} /> }} />
      <Tabs.Screen name="tickets" options={{ title: language === 'pt' ? 'Ingressos' : 'Tickets', tabBarIcon: ({ color }) => <Ticket color={color} size={23} /> }} />
      <Tabs.Screen name="account" options={{ title: language === 'pt' ? 'Conta' : 'Account', tabBarIcon: ({ color }) => <UserRound color={color} size={23} /> }} />
    </Tabs>
  );
}
