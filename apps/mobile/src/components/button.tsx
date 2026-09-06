import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  style?: ViewStyle;
};

export function Button({ label, onPress, icon: Icon, loading, disabled, variant = 'primary', style }: Props) {
  const blocked = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], blocked && styles.disabled, pressed && !blocked && styles.pressed, style]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ink : colors.text} />
      ) : Icon ? (
        <Icon size={18} color={variant === 'primary' ? colors.ink : variant === 'danger' ? colors.rose : colors.text} />
      ) : null}
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel, variant === 'danger' && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, paddingHorizontal: 18, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: 'rgba(255,107,131,0.10)', borderWidth: 1, borderColor: 'rgba(255,107,131,0.32)' },
  ghost: { backgroundColor: 'transparent' },
  label: { color: colors.text, fontWeight: '800', fontSize: 15 },
  primaryLabel: { color: colors.ink },
  dangerLabel: { color: colors.rose },
  disabled: { opacity: 0.52 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
});
