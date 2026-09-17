import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar } from '@/src/components/profile-avatar';
import { publicAuthorName } from '@/src/lib/public-profile-data';
import { isUuid } from '@/src/lib/storage';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import type { Review } from '@/src/types';

export function PublicAuthor({ review, subtitle }: { review: Review; subtitle?: string }) {
  const { language } = usePreferences();
  const name = publicAuthorName(review.authorName);
  const clickable = !review.isDemo && isUuid(review.userId);
  return (
    <Pressable
      disabled={!clickable}
      accessibilityRole={clickable ? 'button' : undefined}
      accessibilityLabel={clickable ? `${language === 'pt' ? 'Ver perfil de' : 'View profile of'} ${name}` : name}
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: review.userId! } } as never)}
      style={({ pressed }) => [styles.row, pressed && clickable && styles.pressed]}>
      <ProfileAvatar name={name} uri={review.authorAvatarLocalUri || review.authorAvatarUrl} size={40} />
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.name}>{name}</Text>
        {subtitle ? <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  pressed: { opacity: 0.65 },
});
