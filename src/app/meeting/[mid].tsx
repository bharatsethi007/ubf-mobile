import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AppHeader, Card, Screen, Text } from '@/components/kit'
import { colors, radius, spacing } from '@/theme'
import { hhmm } from '@/lib/conferencesApi'
import MeetingPhotos from '@/components/MeetingPhotos'
import MeetingRecorder from '@/components/MeetingRecorder'
import {
  LARGE_FIELDS,
  fetchMeetingNotes,
  newId,
  saveMeetingNotes,
  type NoteField,
} from '@/lib/meetingNotesApi'

export default function MeetingScreen() {
  const params = useLocalSearchParams<{ mid: string; name?: string; start?: string; end?: string }>()
  const router = useRouter()
  const mid = String(params.mid)
  const name = params.name ? String(params.name) : 'Agent'
  const timeLabel =
    params.start && params.end ? `${hhmm(String(params.start))}–${hhmm(String(params.end))}` : undefined

  const [fields, setFields] = useState<NoteField[]>([])
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
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
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
