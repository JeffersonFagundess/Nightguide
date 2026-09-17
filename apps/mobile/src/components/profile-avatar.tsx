import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

type Props = {
  name?: string;
  uri?: string;
  size?: number;
};

export function ProfileAvatar({ name = 'NightGuide', uri, size = 64 }: Props) {
  const [failedUri, setFailedUri] = useState<string>();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NG';

  if (uri && uri !== failedUri) {
    return <Image source={{ uri }} onError={() => setFailedUri(uri)} resizeMode="cover" style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: Math.max(15, Math.round(size * 0.34)) }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.elevated },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.12)', borderWidth: 1, borderColor: 'rgba(226,255,84,0.28)' },
  initials: { color: colors.accent, fontWeight: '900', letterSpacing: -0.5 },
});
