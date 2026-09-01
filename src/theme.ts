// UBF mobile design tokens — mirrors the web portal brand.

export const colors = {
  navy: '#0A2472',
  orange: '#F5880D',

  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  border: '#E5E7EB',

  text: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',

  primary: '#0A2472',
  primaryText: '#FFFFFF',

  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 30,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const
