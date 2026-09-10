import { DynamicColorIOS, Platform, PlatformColor } from 'react-native';

function adaptive(name: string, light: string, dark: string): string {
  if (Platform.OS === 'android') return PlatformColor(`@color/${name}`) as unknown as string;
  if (Platform.OS === 'ios') return DynamicColorIOS({ light, dark }) as unknown as string;
  return dark;
}

export const colors = {
  background: adaptive('nightguide_background', '#F5F6F0', '#09090B'),
  surface: adaptive('nightguide_surface', '#FFFFFF', '#141416'),
  elevated: adaptive('nightguide_elevated', '#E9ECE3', '#1D1D20'),
  border: adaptive('nightguide_border', '#D2D6CC', '#2B2B30'),
  text: adaptive('nightguide_text', '#171A14', '#F7F7F2'),
  muted: adaptive('nightguide_muted', '#62685E', '#A7A7AE'),
  accent: adaptive('nightguide_accent', '#667900', '#E2FF54'),
  accentStrong: adaptive('nightguide_accent_strong', '#4F6000', '#C7E638'),
  ink: adaptive('nightguide_ink', '#FFFFFF', '#111207'),
  rose: '#FF6B83',
  blue: '#65B7FF',
  success: '#67E8A5',
  warning: '#FFCB66',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;
