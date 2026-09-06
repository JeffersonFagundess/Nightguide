import { Tabs } from 'expo-router';
import { Compass, MapPinned, Ticket, UserRound } from 'lucide-react-native';

import { colors } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Descobrir', tabBarIcon: ({ color }) => <Compass color={color} size={23} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa', tabBarIcon: ({ color }) => <MapPinned color={color} size={23} /> }} />
      <Tabs.Screen name="tickets" options={{ title: 'Ingressos', tabBarIcon: ({ color }) => <Ticket color={color} size={23} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Conta', tabBarIcon: ({ color }) => <UserRound color={color} size={23} /> }} />
    </Tabs>
  );
}
