import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

type Props = { value: number; onChange: (value: number) => void; label: string };
const min = 1;
const max = 100;

export function DistanceSlider({ value, onChange, label }: Props) {
  const [width, setWidth] = useState(0);
  const percentage = ((value - min) / (max - min)) * 100;

  function update(locationX: number) {
    if (width <= 0) return;
    const next = Math.round(min + Math.max(0, Math.min(1, locationX / width)) * (max - min));
    onChange(next);
  }

  return (
    <View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: `${value} km` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => onChange(Math.max(min, Math.min(max, value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => update(event.nativeEvent.locationX)}
        onResponderMove={(event) => update(event.nativeEvent.locationX)}
        style={styles.touchArea}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${percentage}%` }]} />
      </View>
      <View style={styles.ends}><Text style={styles.end}>1 km</Text><Text style={styles.end}>100 km</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: { height: 42, justifyContent: 'center', marginHorizontal: 10 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, marginLeft: -11, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surface },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { color: colors.muted, fontSize: 11 },
});
