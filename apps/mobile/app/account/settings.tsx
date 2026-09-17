import { router } from 'expo-router';
import { Bell, ChevronRight, Languages, LogOut, Moon, ShieldCheck, UserRound } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { LanguageSwitch } from '@/src/components/language-switch';
import { Screen } from '@/src/components/screen';
import { ThemeSwitch } from '@/src/components/theme-switch';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function AccountSettingsScreen() {
  const { user, logout } = useAuth();
  const { language } = usePreferences();
  const t = { ...copy[language], profileHint: language === 'pt' ? 'Nome, foto, capa e descrição' : 'Name, photo, cover and bio' };

  useEffect(() => {
    if (!user) router.replace('/auth/login');
  }, [user]);

  async function signOut() {
    await logout();
    router.dismissAll();
    router.replace('/(tabs)/account');
  }

  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.eyebrow}>{t.eyebrow}</Text>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.group}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/account/edit-profile' as never)} style={styles.linkRow}>
          <View style={styles.icon}><UserRound size={20} color={colors.accent} /></View>
          <View style={styles.copy}><Text style={styles.rowTitle}>{t.profile}</Text><Text style={styles.rowText}>{t.profileHint}</Text></View>
          <ChevronRight size={20} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.group}>
        <View style={styles.preferenceRow}>
          <View style={styles.icon}><Moon size={20} color={colors.accent} /></View>
          <View style={styles.copy}><Text style={styles.rowTitle}>{t.appearance}</Text><Text style={styles.rowText}>{t.appearanceHint}</Text></View>
        </View>
        <ThemeSwitch />
        <View style={styles.divider} />
        <View style={styles.preferenceRow}>
          <View style={styles.icon}><Languages size={20} color={colors.accent} /></View>
          <View style={styles.copy}><Text style={styles.rowTitle}>{t.language}</Text><Text style={styles.rowText}>{t.languageHint}</Text></View>
        </View>
        <LanguageSwitch />
      </View>

      <View style={styles.group}>
        <View style={styles.infoRow}>
          <View style={styles.icon}><Bell size={20} color={colors.accent} /></View>
          <View style={styles.copy}><Text style={styles.rowTitle}>{t.notifications}</Text><Text style={styles.rowText}>{t.notificationsHint}</Text></View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.icon}><ShieldCheck size={20} color={colors.accent} /></View>
          <View style={styles.copy}><Text style={styles.rowTitle}>{t.offline}</Text><Text style={styles.rowText}>{t.offlineHint}</Text></View>
        </View>
      </View>

      <Button label={t.logout} icon={LogOut} variant="danger" onPress={() => void signOut()} style={styles.logout} />
    </Screen>
  );
}

const copy = {
  pt: { eyebrow: 'PREFERÊNCIAS', title: 'Configurações', subtitle: 'Deixe o NightGuide com a sua cara.', profile: 'Editar perfil', profileHint: 'Nome e foto da conta', appearance: 'Aparência', appearanceHint: 'Escolha o tema do aplicativo', language: 'Idioma', languageHint: 'Português ou inglês', notifications: 'Lembretes de eventos', notificationsHint: 'Ao salvar um evento, o NightGuide prepara um lembrete no aparelho.', offline: 'Dados offline', offlineHint: 'Publicações, favoritos e ingressos ficam salvos e sincronizam quando a internet voltar.', logout: 'Sair da conta' },
  en: { eyebrow: 'PREFERENCES', title: 'Settings', subtitle: 'Make NightGuide feel like yours.', profile: 'Edit profile', profileHint: 'Account name and photo', appearance: 'Appearance', appearanceHint: 'Choose the app theme', language: 'Language', languageHint: 'Portuguese or English', notifications: 'Event reminders', notificationsHint: 'When you save an event, NightGuide prepares a reminder on this device.', offline: 'Offline data', offlineHint: 'Posts, favorites and tickets stay saved and sync when your connection returns.', logout: 'Sign out' },
} as const;

const styles = StyleSheet.create({
  content: { paddingTop: 10 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 8 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  group: { gap: 13, marginTop: 20, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  linkRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoRow: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  copy: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  rowText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border },
  logout: { marginTop: 22 },
});
