import type { ComponentProps, ReactNode } from 'react'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, fontSize, fontWeight, radius, shadows, spacing } from '@/theme'

/* ---------------- Screen ---------------- */

export function Screen({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={[styles.screenBody, style]}>{children}</View>
    </SafeAreaView>
  )
}

/* ---------------- AppHeader (large title) ---------------- */

export function AppHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={14}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressedSoft]}
          >
            <Ionicons name="chevron-back" size={26} color={colors.navy} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.headerRight}>{right}</View>
      </View>
      <RNText style={styles.headerTitle} numberOfLines={1}>
        {title}
      </RNText>
      {subtitle ? (
        <RNText style={styles.headerSubtitle} numberOfLines={1}>
          {subtitle}
        </RNText>
      ) : null}
    </View>
  )
}

/* ---------------- Text ---------------- */

type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'muted'
  | 'small'

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
  const alt = variant === 'secondary' || variant === 'ghost'
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && shadows.sm,
        btnVariants[variant],
        pressed && !isDisabled && styles.pressedScale,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={alt ? colors.navy : '#fff'} />
      ) : (
        <RNText style={[styles.btnText, alt && styles.btnTextAlt]}>{title}</RNText>
      )}
    </Pressable>
  )
}

/* ---------------- IconButton ---------------- */

type IoniconName = ComponentProps<typeof Ionicons>['name']

export function IconButton({
  name,
  onPress,
  tone = 'navy',
  size = 20,
}: {
  name: IoniconName
  onPress?: () => void
  tone?: 'navy' | 'danger' | 'muted'
  size?: number
}) {
  const color = tone === 'danger' ? colors.danger : tone === 'muted' ? colors.textMuted : colors.navy
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedScale]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  )
}

/* ---------------- Avatar ---------------- */

export function Avatar({ label, size = 44 }: { label: string; size?: number }) {
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <RNText style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials || '·'}</RNText>
    </View>
  )
}

/* ---------------- Card / Surface ---------------- */

export function Card({
  children,
  style,
  onPress,
  elevated = true,
  padded = true,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  elevated?: boolean
  padded?: boolean
}) {
  const base: StyleProp<ViewStyle> = [
    styles.card,
    padded && styles.cardPadded,
    elevated ? shadows.md : undefined,
    style,
  ]
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && styles.pressedScale]}
      >
        {children}
      </Pressable>
    )
  }
  return <View style={base}>{children}</View>
}

/* ---------------- Input ---------------- */

export function Input({
  label,
  style,
  ...rest
}: TextInputProps & { label?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.inputWrap}>
      {label ? <RNText style={styles.inputLabel}>{label}</RNText> : null}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, style]}
        placeholderTextColor={colors.textSubtle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </View>
  )
}

/* ---------------- Badge ---------------- */

type BadgeTone = 'navy' | 'muted' | 'success' | 'warning' | 'danger' | 'orange'

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

  pressedScale: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  pressedSoft: { opacity: 0.55 },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
    gap: spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  backBtn: {
    width: 36,
    height: 36,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  backSpacer: { height: 4 },
  backChevron: { fontSize: 30, lineHeight: 32, color: colors.navy, marginTop: -2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: fontSize.md, color: colors.textMuted },

  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.primaryText, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: 0.2 },
  btnTextAlt: { color: colors.navy },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPadded: { padding: spacing.lg },

  inputWrap: { gap: spacing.xs },
  inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  inputFocused: { borderColor: colors.navy },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.3 },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  avatarText: { color: '#fff', fontWeight: fontWeight.bold },
})

const textVariants = StyleSheet.create({
  display: { fontSize: fontSize.display, fontWeight: fontWeight.heavy, color: colors.ink, letterSpacing: -0.5 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.ink, letterSpacing: -0.3 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.ink },
  subtitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textMuted },
  body: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  muted: { fontSize: fontSize.sm, color: colors.textMuted },
  small: { fontSize: fontSize.xs, color: colors.textSubtle },
})

const btnVariants = StyleSheet.create({
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.navy },
  ghost: { backgroundColor: 'transparent', minHeight: 0, paddingVertical: spacing.sm },
  danger: { backgroundColor: colors.danger },
})

const badgeTones: Record<BadgeTone, { bg: ViewStyle; fg: TextStyle }> = {
  navy: { bg: { backgroundColor: '#EAEEFC' }, fg: { color: colors.navy } },
  orange: { bg: { backgroundColor: '#FEF0DD' }, fg: { color: '#B4610A' } },
  muted: { bg: { backgroundColor: colors.surfaceMuted }, fg: { color: colors.textMuted } },
  success: { bg: { backgroundColor: '#DCFCE7' }, fg: { color: '#166534' } },
  warning: { bg: { backgroundColor: '#FEF3C7' }, fg: { color: '#92400E' } },
  danger: { bg: { backgroundColor: '#FEE2E2' }, fg: { color: '#991B1B' } },
}
