import { MoonStar } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel="NightGuide">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <MoonStar color={colors.ink} size={compact ? 17 : 21} strokeWidth={2.5} />
      </View>
      <Text style={[styles.name, compact && styles.nameCompact]}>NightGuide</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  markCompact: { width: 32, height: 32, borderRadius: 10 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  nameCompact: { fontSize: 20 },
});
