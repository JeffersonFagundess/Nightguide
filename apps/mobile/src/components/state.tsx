import type { LucideIcon } from 'lucide-react-native';
import { AlertCircle } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { colors } from '@/src/theme';

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  text,
  icon: Icon = AlertCircle,
  action,
}: {
  title: string;
  text: string;
  icon?: LucideIcon;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.icon}><Icon color={colors.accent} size={24} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 14 },
  empty: { alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, padding: 24 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)', marginBottom: 14 },
  title: { color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.muted, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  action: { marginTop: 18, alignSelf: 'stretch' },
});
