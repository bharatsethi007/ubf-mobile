import { useCallback, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'

import { AppHeader, Avatar, Badge, Card, Screen, Text } from '@/components/kit'
import { colors, radius, spacing } from '@/theme'
import {
  dayLabel,
  fetchConference,
  formatDateRange,
  hhmm,
  listConferenceMeetings,
  type ConferenceCard,
  type ConferenceMeeting,
  type MeetingStatus,
} from '@/lib/conferencesApi'

const STATUS_TONE: Record<MeetingStatus, { label: string; tone: 'muted' | 'success' | 'danger' | 'warning' }> = {
  upcoming: { label: 'Upcoming', tone: 'muted' },
  completed: { label: 'Done', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  no_show: { label: 'No-show', tone: 'warning' },
}

export default function ConferenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [conf, setConf] = useState<ConferenceCard | null>(null)
  const [meetings, setMeetings] = useState<ConferenceMeeting[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let active = true
      setLoading(true)
      Promise.all([fetchConference(String(id)), listConferenceMeetings(String(id))])
        .then(([c, m]) => {
          if (!active) return
          setConf(c)
          setMeetings(m)
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false)
        })
      return () => {
        active = false
      }
    }, [id]),
  )

  // group meetings by day
  const byDay: { day: string; rows: ConferenceMeeting[] }[] = []
  for (const m of meetings) {
    const last = byDay[byDay.length - 1]
    if (last && last.day === m.meeting_date) last.rows.push(m)
    else byDay.push({ day: m.meeting_date, rows: [m] })
  }

  return (
    <Screen>
      <AppHeader title={conf?.name ?? 'Conference'} onBack={() => router.back()} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : !conf ? (
        <View style={{ padding: spacing.xl }}>
          <Text variant="muted">Conference not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xl }}>
          {/* summary */}
          <Card padded={false}>
            <View style={{ height: 150, backgroundColor: colors.navy }}>
              {conf.cover_image_url ? (
                <Image
                  source={{ uri: conf.cover_image_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={250}
                />
              ) : null}
            </View>
            <View style={{ padding: spacing.lg, gap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap' }}>
              {conf.network_code ? <Badge label={conf.network_code} tone="navy" /> : null}
              <Badge label={formatDateRange(conf.start_date, conf.end_date)} tone="muted" />
              <Badge label={`${meetings.length} ${meetings.length === 1 ? 'agent' : 'agents'}`} tone="orange" />
            </View>
          </Card>

          {/* agents / meetings */}
          <View style={{ gap: spacing.lg }}>
            <Text variant="label">Agents</Text>
            {byDay.length === 0 ? (
              <Card>
                <Text variant="muted">No meetings scheduled yet.</Text>
              </Card>
            ) : (
              byDay.map((group) => (
                <View key={group.day} style={{ gap: spacing.md }}>
                  <Text variant="subtitle">{dayLabel(group.day)}</Text>
                  <View style={{ gap: spacing.md }}>
                    {group.rows.map((m) => (
                      <MeetingRow key={m.id} m={m} />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  )
}

function MeetingRow({ m }: { m: ConferenceMeeting }) {
  if (m.is_break) {
    return (
      <View style={styles.breakRow}>
        <Text variant="muted">☕  {m.agent_name || 'Break'}</Text>
        <Text variant="small">
          {hhmm(m.start_time)}–{hhmm(m.end_time)}
        </Text>
      </View>
    )
  }
  const s = STATUS_TONE[m.status]
  const name = m.agent_name ?? 'Unassigned'
  return (
    <Card padded={false}>
      <View style={styles.meetingInner}>
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{hhmm(m.start_time)}</Text>
          <Text variant="small">{hhmm(m.end_time)}</Text>
        </View>
        <View style={styles.divider} />
        <Avatar label={name} size={38} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Badge label={s.label} tone={s.tone} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  meetingInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  timeCol: { width: 44, alignItems: 'center' },
  timeText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
  },
})
