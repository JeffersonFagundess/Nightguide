import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, useWindowDimensions } from 'react-native';

export function PostImage({ source, rounded = false }: { source: ImageSourcePropType; rounded?: boolean }) {
  const { width } = useWindowDimensions();
  const height = Math.min(220, Math.max(170, Math.round(width * 0.5)));

  return (
    <Image
      source={source}
      resizeMode="cover"
      style={[styles.image, { height }, rounded && styles.rounded]}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%' },
  rounded: { borderRadius: 12 },
});
