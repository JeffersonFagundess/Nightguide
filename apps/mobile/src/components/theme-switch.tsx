import { Moon, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export function ThemeSwitch() {
  const { language, theme, setTheme } = usePreferences();
  return (
    <View style={styles.shell} accessibilityLabel={language === 'pt' ? 'Tema do aplicativo' : 'App theme'}>
      <Pressable
        accessibilityLabel={language === 'pt' ? 'Tema escuro' : 'Dark theme'}
        onPress={() => setTheme('dark')}
        style={[styles.option, theme === 'dark' && styles.active]}>
        <Moon size={15} color={theme === 'dark' ? colors.ink : colors.muted} />
        <Text style={[styles.text, theme === 'dark' && styles.activeText]}>{language === 'pt' ? 'Escuro' : 'Dark'}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={language === 'pt' ? 'Tema claro' : 'Light theme'}
        onPress={() => setTheme('light')}
        style={[styles.option, theme === 'light' && styles.active]}>
        <Sun size={15} color={theme === 'light' ? colors.ink : colors.muted} />
        <Text style={[styles.text, theme === 'light' && styles.activeText]}>{language === 'pt' ? 'Claro' : 'Light'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  option: { minHeight: 30, paddingHorizontal: 7, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  active: { backgroundColor: colors.accent },
  text: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  activeText: { color: colors.ink },
});
