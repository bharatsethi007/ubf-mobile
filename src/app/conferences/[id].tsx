import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'

import { AppHeader, Avatar, Badge, Button, Card, Screen, Text } from '@/components/kit'
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
import { scheduleMeetingReminders } from '@/lib/meetingNotifications'
import { maybePromptBatteryOptimization } from '@/lib/batteryPrompt'

const STATUS_TONE: Record<MeetingStatus, { label: string; tone: 'muted' | 'success' | 'danger' | 'warning' }> = {
  upcoming: { label: 'Upcoming', tone: 'muted' },
  completed: { label: 'Done', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  no_show: { label: 'No-show', tone: 'warning' },
}

type Display = { label: string; tone: 'muted' | 'success' | 'danger' | 'warning'; live: boolean }

function meetingDisplay(m: ConferenceMeeting): Display {
  if (m.status !== 'upcoming') return { ...STATUS_TONE[m.status], live: false }
  const now = new Date()
  const start = new Date(`${m.meeting_date}T${m.start_time}`)
  const end = new Date(`${m.meeting_date}T${m.end_time}`)
  if (now >= start && now <= end) return { label: 'Now', tone: 'success', live: true }
  return { label: 'Upcoming', tone: 'muted', live: false }
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
  const [loadError, setLoadError] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(i)
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([fetchConference(String(id)), listConferenceMeetings(String(id))])
      .then(([c, m]) => {
        setConf(c)
        setMeetings(m)
        setLoadError(false)
        if (c) setDay((prev) => prev || defaultActiveDay(c.start_date, c.end_date))
        void scheduleMeetingReminders(m).then((n) => {
          if (n > 0) void maybePromptBatteryOptimization()
        })
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [id])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData]),
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
          <Text variant="muted" style={{ textAlign: 'center' }}>
            {loadError ? "Couldn't load this conference. Check your connection." : 'Conference not found.'}
          </Text>
          {loadError ? <Button title="Retry" variant="secondary" onPress={loadData} /> : null}
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
                      `/meeting/${m.id}?name=${encodeURIComponent(m.agent_name ?? 'Agent')}&start=${m.start_time}&end=${m.end_time}&status=${m.status}` as Href,
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
  const d = meetingDisplay(m)
  const name = m.agent_name ?? 'Unassigned'
  return (
    <Card padded={false} onPress={onPress} style={d.live ? styles.meetingLive : undefined}>
      <View style={styles.meetingInner}>
        <View style={styles.timeCol}>
          <Text style={[styles.timeText, d.live && styles.timeTextLive]}>{hhmm(m.start_time)}</Text>
          <Text variant="small">{hhmm(m.end_time)}</Text>
        </View>
        <View style={styles.divider} />
        <Avatar label={name} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.agentName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        {d.live ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Now</Text>
          </View>
        ) : (
          <Badge label={d.label} tone={d.tone} />
        )}
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
  meetingLive: { borderColor: colors.navy, borderWidth: 1.5 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  timeTextLive: { color: colors.navy },
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
