// UBF mobile design tokens — premium, depth-first (Android-elevation + iOS-shadow).
import { Platform, type ViewStyle } from 'react-native'

export const colors = {
  navy: '#0A2472',
  navyDeep: '#071A54',
  orange: '#F5880D',

  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFCFE',
  surfaceMuted: '#F1F3F9',

  border: '#E9ECF3',
  borderStrong: '#D7DBE6',

  ink: '#0B1220',
  text: '#1A2233',
  textMuted: '#667085',
  textSubtle: '#98A2B3',

  primary: '#0A2472',
  primaryText: '#FFFFFF',

  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',

  overlay: 'rgba(9,17,38,0.45)',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  pill: 999,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const

// Cross-platform depth: iOS shadow + Android elevation.
function shadow(elevation: number, radiusPx: number, opacity: number): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#0A1B4D',
      shadowOffset: { width: 0, height: Math.round(elevation / 2) },
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
    },
    android: { elevation },
    default: {},
  }) as ViewStyle
}

export const shadows = {
  sm: shadow(2, 6, 0.06),
  md: shadow(5, 14, 0.1),
  lg: shadow(10, 24, 0.14),
} as const
