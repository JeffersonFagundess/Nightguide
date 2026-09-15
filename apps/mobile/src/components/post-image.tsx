import { X } from 'lucide-react-native';
import { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Modal, Pressable, SafeAreaView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/src/theme';

export function PostImage({ source, rounded = false, expandable = true }: { source: ImageSourcePropType; rounded?: boolean; expandable?: boolean }) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const height = Math.min(220, Math.max(170, Math.round(width * 0.5)));

  return (
    <>
      <Pressable
        accessibilityRole={expandable ? 'button' : undefined}
        accessibilityLabel={expandable ? 'Abrir foto em tela cheia' : undefined}
        disabled={!expandable}
        onPress={() => setOpen(true)}>
        <Image source={source} resizeMode="cover" style={[styles.image, { height }, rounded && styles.rounded]} />
      </Pressable>
      <Modal animationType="fade" visible={open} transparent statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.fullscreen}>
          <View style={styles.fullscreenStage}>
            <Image source={source} resizeMode="contain" style={styles.fullscreenImage} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar foto" onPress={() => setOpen(false)} style={styles.close}>
            <X size={25} color={colors.text} />
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%' },
  rounded: { borderRadius: 12 },
  fullscreen: { flex: 1, backgroundColor: '#000' },
  fullscreenStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 14, right: 14, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,20,22,0.88)' },
});
