import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Text as RNText,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme'

/* ---------------- Screen ---------------- */

export function Screen({
  children,
  style,
  padded = false,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={[styles.screenBody, padded && styles.screenPadded, style]}>{children}</View>
    </SafeAreaView>
  )
}

/* ---------------- AppHeader ---------------- */

export function AppHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.headerBack}>
          <RNText style={styles.headerBackText}>‹</RNText>
        </TouchableOpacity>
      ) : null}
      <RNText style={styles.headerTitle} numberOfLines={1}>
        {title}
      </RNText>
      <View style={styles.headerRight}>{right}</View>
    </View>
  )
}

/* ---------------- Text ---------------- */

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'muted' | 'small'

export function Text({
  variant = 'body',
  style,
  children,
  ...rest
}: TextProps & { variant?: TextVariant }) {
  return (
    <RNText style={[textVariants[variant], style]} {...rest}>
      {children}
    </RNText>
  )
}

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string
  onPress?: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const isDisabled = disabled || loading
  const alt = variant !== 'primary' && variant !== 'danger'
  return (
    <TouchableOpacity
      style={[styles.btn, btnVariants[variant], isDisabled && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={alt ? colors.navy : '#fff'} />
      ) : (
        <RNText style={[styles.btnText, alt && styles.btnTextAlt]}>{title}</RNText>
      )}
    </TouchableOpacity>
  )
}

/* ---------------- Card ---------------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}) {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    )
  }
  return <View style={[styles.card, style]}>{children}</View>
}

/* ---------------- Input ---------------- */

export function Input({
  label,
  style,
  ...rest
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.inputWrap}>
      {label ? <RNText style={styles.inputLabel}>{label}</RNText> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textSubtle}
        {...rest}
      />
    </View>
  )
}

/* ---------------- Badge ---------------- */

type BadgeTone = 'navy' | 'muted' | 'success' | 'warning' | 'danger'

export function Badge({ label, tone = 'navy' }: { label: string; tone?: BadgeTone }) {
  return (
    <View style={[styles.badge, badgeTones[tone].bg]}>
      <RNText style={[styles.badgeText, badgeTones[tone].fg]}>{label}</RNText>
    </View>
  )
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenBody: { flex: 1 },
  screenPadded: { padding: spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: { paddingRight: spacing.xs },
  headerBackText: { fontSize: 28, lineHeight: 28, color: colors.navy, fontWeight: fontWeight.regular },
  headerTitle: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.navy },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.primaryText, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  btnTextAlt: { color: colors.navy },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  inputWrap: { gap: spacing.xs },
  inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
})

const textVariants = StyleSheet.create({
  display: { fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.text },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.navy },
  body: { fontSize: fontSize.md, color: colors.text },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  muted: { fontSize: fontSize.sm, color: colors.textMuted },
  small: { fontSize: fontSize.xs, color: colors.textMuted },
})

const btnVariants = StyleSheet.create({
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.navy },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
})

const badgeTones: Record<BadgeTone, { bg: ViewStyle; fg: TextStyle }> = {
  navy: { bg: { backgroundColor: '#EEF1FB' }, fg: { color: colors.navy } },
  muted: { bg: { backgroundColor: colors.surfaceMuted }, fg: { color: colors.textMuted } },
  success: { bg: { backgroundColor: '#DCFCE7' }, fg: { color: '#166534' } },
  warning: { bg: { backgroundColor: '#FEF3C7' }, fg: { color: '#92400E' } },
  danger: { bg: { backgroundColor: '#FEE2E2' }, fg: { color: '#991B1B' } },
}
