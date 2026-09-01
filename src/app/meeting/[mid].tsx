import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AppHeader, Button, Card, Screen, Text } from '@/components/kit'
import { colors, radius, spacing } from '@/theme'
import { hhmm } from '@/lib/conferencesApi'
import { updateMeetingStatus, type MeetingStatus } from '@/lib/conferencesApi'
import MeetingPhotos from '@/components/MeetingPhotos'
import MeetingRecorder from '@/components/MeetingRecorder'
import { buildMeetingShareMessage } from '@/lib/meetingShare'
import {
  LARGE_FIELDS,
  fetchMeetingNotes,
  newId,
  saveMeetingNotes,
  type NoteField,
} from '@/lib/meetingNotesApi'

const STATUS_OPTS: { key: MeetingStatus; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'no_show', label: 'No-show' },
]

export default function MeetingScreen() {
  const params = useLocalSearchParams<{
    mid: string
    name?: string
    start?: string
    end?: string
    status?: string
  }>()
  const router = useRouter()
  const mid = String(params.mid)
  const name = params.name ? String(params.name) : 'Agent'
  const timeLabel =
    params.start && params.end ? `${hhmm(String(params.start))}–${hhmm(String(params.end))}` : undefined

  const [fields, setFields] = useState<NoteField[]>([])
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>(
    (params.status as MeetingStatus) || 'upcoming',
  )

  async function changeStatus(next: MeetingStatus) {
    const prev = meetingStatus
    setMeetingStatus(next)
    try {
      await updateMeetingStatus(mid, next)
    } catch {
      setMeetingStatus(prev)
    }
  }
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedJson = useRef('')

  useEffect(() => {
    let active = true
    fetchMeetingNotes(mid)
      .then((f) => {
        if (!active) return
        setFields(f)
        savedJson.current = JSON.stringify(f)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [mid])

  const persist = useCallback(
    async (next: NoteField[]) => {
      setStatus('saving')
      try {
        await saveMeetingNotes(mid, next)
        savedJson.current = JSON.stringify(next)
        setStatus('saved')
      } catch {
        setStatus('idle')
      }
    },
    [mid],
  )

  const queueSave = useCallback(
    (next: NoteField[]) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (JSON.stringify(next) !== savedJson.current) void persist(next)
      }, 1000)
    },
    [persist],
  )

  function update(next: NoteField[]) {
    setFields(next)
    setStatus('idle')
    queueSave(next)
  }

  function setValue(id: string, value: string) {
    update(fields.map((f) => (f.id === id ? { ...f, value } : f)))
  }
  function setLabel(id: string, label: string) {
    update(fields.map((f) => (f.id === id ? { ...f, label } : f)))
  }
  function remove(id: string) {
    update(fields.filter((f) => f.id !== id))
  }
  function addField() {
    update([...fields, { id: newId(), label: '', value: '' }])
  }

  const reloadNotes = useCallback(() => {
    fetchMeetingNotes(mid)
      .then((f) => {
        setFields(f)
        savedJson.current = JSON.stringify(f)
        setStatus('saved')
      })
      .catch(() => {})
  }, [mid])

  async function onShare() {
    try {
      const message = await buildMeetingShareMessage(mid, name)
      await Share.share({ message })
    } catch {
      // user dismissed or nothing to share
    }
  }

  const statusText = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''

  return (
    <Screen>
      <AppHeader
        title={name}
        subtitle={timeLabel}
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {statusText ? <Text variant="small">{statusText}</Text> : null}
            <MeetingRecorder meetingId={mid} onTranscribed={reloadNotes} />
          </View>
        }
      />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.statusRow}>
              {STATUS_OPTS.map((o) => {
                const on = meetingStatus === o.key
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => void changeStatus(o.key)}
                    style={[styles.statusPill, on && styles.statusPillOn]}
                  >
                    <Text style={[styles.statusPillText, on && styles.statusPillTextOn]}>
                      {o.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {fields.map((f) => {
              const large = LARGE_FIELDS.has(f.label.trim())
              return (
                <Card key={f.id} style={{ gap: spacing.xs }}>
                  <View style={styles.fieldHead}>
                    <TextInput
                      style={styles.labelInput}
                      value={f.label}
                      onChangeText={(t) => setLabel(f.id, t)}
                      placeholder="Field name"
                      placeholderTextColor={colors.textSubtle}
                    />
                    <Pressable onPress={() => remove(f.id)} hitSlop={10}>
                      <Ionicons name="close" size={18} color={colors.textSubtle} />
                    </Pressable>
                  </View>
                  <TextInput
                    style={[styles.valueInput, large && styles.valueInputLarge]}
                    value={f.value}
                    onChangeText={(t) => setValue(f.id, t)}
                    placeholder="—"
                    placeholderTextColor={colors.textSubtle}
                    multiline
                  />
                </Card>
              )
            })}

            <Pressable
              onPress={addField}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add" size={18} color={colors.textMuted} />
              <Text variant="muted" style={{ fontWeight: '600' }}>
                Add field
              </Text>
            </Pressable>

            <MeetingPhotos meetingId={mid} />

            <Button
              title="Share meeting"
              variant="secondary"
              onPress={() => void onShare()}
              style={{ marginTop: spacing.sm }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  statusPillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  statusPillText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  statusPillTextOn: { color: '#fff' },

  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  labelInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: 2,
  },
  valueInput: {
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 4,
    lineHeight: 22,
  },
  valueInputLarge: { minHeight: 160, textAlignVertical: 'top' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
})
