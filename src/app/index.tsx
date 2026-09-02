import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'

import { useAuth } from '@/lib/auth'
import { AppHeader, Avatar, Badge, Button, Card, IconButton, Screen, Text } from '@/components/kit'
import { colors, radius, shadows, spacing } from '@/theme'
import {
  conferenceBucket,
  formatDateRange,
  listConferences,
  type ConferenceCard,
} from '@/lib/conferencesApi'

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function HomeScreen() {
  const { session, signOut } = useAuth()
  const router = useRouter()
  const email = session?.user.email ?? ''
  const name = titleCase(email.split('@')[0] || 'there')

  const [items, setItems] = useState<ConferenceCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await listConferences())
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      let active = true
      setLoading(true)
      load().finally(() => {
        if (active) setLoading(false)
      })
      return () => {
        active = false
      }
    }, [load]),
  )

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const current = items.filter((c) => conferenceBucket(c) === 'current')
  const upcoming = items
    .filter((c) => conferenceBucket(c) === 'upcoming')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const featured = current[0] ?? upcoming[0] ?? null
  const rest = [...current.slice(featured && current[0] ? 1 : 0), ...upcoming].filter(
    (c) => c.id !== featured?.id,
  )
  const isLive = featured ? conferenceBucket(featured) === 'current' : false

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.greetRow}>
          <Avatar label={name} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hello, {name}</Text>
            <Text variant="muted">See your meetings today</Text>
          </View>
          <IconButton name="log-out-outline" tone="danger" onPress={() => void signOut()} />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
          }
        >
          {featured ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="label">{isLive ? 'Happening now' : 'Next up'}</Text>
              <HeroCard c={featured} live={isLive} onPress={() => router.push(`/conferences/${featured.id}`)} />
            </View>
          ) : error ? (
            <Card style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <Text variant="muted">Couldn&apos;t load conferences. Check your connection.</Text>
              <Button title="Retry" variant="secondary" onPress={() => void load()} />
            </Card>
          ) : (
            <Card>
              <Text variant="muted">No conferences yet.</Text>
            </Card>
          )}

          {rest.length > 0 && (
            <View style={{ gap: spacing.md }}>
              <Text variant="label">Upcoming</Text>
              <View style={{ gap: spacing.md }}>
                {rest.map((c) => (
                  <UpcomingRow key={c.id} c={c} onPress={() => router.push(`/conferences/${c.id}`)} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  )
}

function HeroCard({ c, live, onPress }: { c: ConferenceCard; live: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.hero, shadows.lg, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      {c.cover_image_url ? (
        <Image
          source={{ uri: c.cover_image_url }}
          style={styles.heroBg}
          contentFit="cover"
          transition={250}
        />
      ) : null}
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <View style={styles.heroTopRow}>
          {c.network_code ? (
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{c.network_code}</Text>
            </View>
          ) : (
            <View />
          )}
          {live ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 4 }}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {c.name}
          </Text>
          {c.location_name ? (
            <Text style={styles.heroLocation} numberOfLines={1}>
              {c.location_name}
            </Text>
          ) : null}
        </View>

        <View style={styles.heroBottom}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={14} color="#fff" />
            <Text style={styles.datePillText}>{formatDateRange(c.start_date, c.end_date)}</Text>
          </View>
          <View style={styles.heroGo}>
            <Ionicons name="arrow-forward" size={22} color={colors.navy} />
          </View>
        </View>
      </View>
    </Pressable>
  )
}

function UpcomingRow({ c, onPress }: { c: ConferenceCard; onPress: () => void }) {
  return (
    <Card onPress={onPress} padded={false}>
      <View style={styles.rowInner}>
        <View style={styles.rowThumb}>
          {c.cover_image_url ? (
            <Image source={{ uri: c.cover_image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{c.network_code ?? 'UBF'}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" numberOfLines={1}>
            {c.name}
          </Text>
          <Text variant="muted">{formatDateRange(c.start_date, c.end_date)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
      </View>
    </Card>
  )
}


const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hello: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },

  hero: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    minHeight: 210,
  },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,20,70,0.72)' },
  heroContent: { flex: 1, padding: spacing.xl, justifyContent: 'space-between', gap: spacing.lg },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  heroChipText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  heroLocation: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  datePillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  heroGo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
