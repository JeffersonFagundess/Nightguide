import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export function LanguageSwitch() {
  const { language, setLanguage } = usePreferences();
  return (
    <View style={styles.shell} accessibilityLabel="Idioma / Language">
      <Pressable onPress={() => setLanguage('pt')} style={[styles.option, language === 'pt' && styles.active]}>
        <Text style={[styles.text, language === 'pt' && styles.activeText]}>PT-BR</Text>
      </Pressable>
      <Pressable onPress={() => setLanguage('en')} style={[styles.option, language === 'en' && styles.active]}>
        <Text style={[styles.text, language === 'en' && styles.activeText]}>EN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  option: { minHeight: 30, minWidth: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  active: { backgroundColor: colors.accent },
  text: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  activeText: { color: colors.ink },
});
