import { useCallback, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'

import { AppHeader, Avatar, Badge, Card, Screen, Text } from '@/components/kit'
import { colors, radius, spacing } from '@/theme'
import {
  conferenceDays,
  defaultActiveDay,
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

function pillLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]}\n${d.getDate()}`
}

export default function ConferenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [conf, setConf] = useState<ConferenceCard | null>(null)
  const [meetings, setMeetings] = useState<ConferenceMeeting[]>([])
  const [day, setDay] = useState<string>('')
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
          if (c) setDay((prev) => prev || defaultActiveDay(c.start_date, c.end_date))
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

  const days = conf ? conferenceDays(conf.start_date, conf.end_date) : []
  const todayISO = new Date().toISOString().slice(0, 10)
  const dayMeetings = meetings.filter((m) => m.meeting_date === day)

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
        <>
          {/* Day selector */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayBar}
            >
              {days.map((d, i) => {
                const selected = d === day
                const isToday = d === todayISO
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDay(d)}
                    style={[styles.dayPill, selected && styles.dayPillOn]}
                  >
                    <Text style={[styles.dayPillDow, selected && styles.dayPillTextOn]}>
                      {pillLabel(d).split('\n')[0]}
                    </Text>
                    <Text style={[styles.dayPillNum, selected && styles.dayPillTextOn]}>
                      {pillLabel(d).split('\n')[1]}
                    </Text>
                    {isToday ? <View style={[styles.todayDot, selected && styles.todayDotOn]} /> : null}
                    <Text style={[styles.dayPillIdx, selected && styles.dayPillTextOn]}>Day {i + 1}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs }}>
              {conf.network_code ? <Badge label={conf.network_code} tone="navy" /> : null}
              <Badge label={formatDateRange(conf.start_date, conf.end_date)} tone="muted" />
              <Badge
                label={`${dayMeetings.length} ${dayMeetings.length === 1 ? 'agent' : 'agents'}`}
                tone="orange"
              />
            </View>

            {dayMeetings.length === 0 ? (
              <Card>
                <Text variant="muted">No meetings scheduled for this day.</Text>
              </Card>
            ) : (
              dayMeetings.map((m) => (
                <MeetingRow
                  key={m.id}
                  m={m}
                  onPress={() =>
                    router.push(
                      `/meeting/${m.id}?name=${encodeURIComponent(m.agent_name ?? 'Agent')}&start=${m.start_time}&end=${m.end_time}` as Href,
                    )
                  }
                />
              ))
            )}
          </ScrollView>
        </>
      )}
    </Screen>
  )
}

function MeetingRow({ m, onPress }: { m: ConferenceMeeting; onPress: () => void }) {
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
    <Card padded={false} onPress={onPress}>
      <View style={styles.meetingInner}>
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{hhmm(m.start_time)}</Text>
          <Text variant="small">{hhmm(m.end_time)}</Text>
        </View>
        <View style={styles.divider} />
        <Avatar label={name} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.agentName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Badge label={s.label} tone={s.tone} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  dayBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.sm },
  dayPill: {
    width: 58,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 1,
  },
  dayPillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayPillDow: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  dayPillNum: { fontSize: 18, fontWeight: '800', color: colors.ink },
  dayPillIdx: { fontSize: 9, fontWeight: '700', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.4 },
  dayPillTextOn: { color: '#fff' },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.orange },
  todayDotOn: { backgroundColor: '#fff' },

  meetingInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  timeCol: { width: 44, alignItems: 'center' },
  timeText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  agentName: { fontSize: 16, fontWeight: '500', color: colors.ink },
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
