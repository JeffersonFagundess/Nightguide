import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '@/src/theme';

type Props = TextInputProps & { label: string; error?: string; rightAccessory?: ReactNode };

export const FormField = forwardRef<TextInput, Props>(function FormField({ label, error, rightAccessory, style, ...props }, ref) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, props.multiline && styles.multilineShell, error && styles.inputError]}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          style={[styles.input, props.multiline && styles.multiline, style]}
          {...props}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  inputShell: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    minHeight: 48,
    flex: 1,
    color: colors.text,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  multilineShell: { minHeight: 110, alignItems: 'flex-start' },
  multiline: { minHeight: 108, paddingTop: 14, textAlignVertical: 'top' },
  accessory: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: colors.rose },
  error: { color: colors.rose, fontSize: 12 },
});
