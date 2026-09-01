import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'

import { IconButton, Text } from '@/components/kit'
import { colors, radius, spacing } from '@/theme'
import { transcribeMeeting, uploadMeetingAudio } from '@/lib/meetingTranscribeApi'

const PAUSE_AFTER_SEC = 17 * 60
const GRACE_SEC = 3 * 60

type Phase = 'idle' | 'recording' | 'paused' | 'processing'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MeetingRecorder({
  meetingId,
  onTranscribed,
}: {
  meetingId: string
  onTranscribed: () => void
}) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true })
  const state = useAudioRecorderState(recorder, 100)

  const [phase, setPhase] = useState<Phase>('idle')
  const [grace, setGrace] = useState(GRACE_SEC)
  const nextPause = useRef(PAUSE_AFTER_SEC)
  const graceTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const recSec = Math.floor((state.durationMillis ?? 0) / 1000)
  const level = Math.max(0, Math.min(1, ((state.metering ?? -60) + 60) / 60))
  const open = phase !== 'idle'

  const clearGrace = () => {
    if (graceTimer.current) clearInterval(graceTimer.current)
    graceTimer.current = null
  }

  const finalize = useCallback(async () => {
    clearGrace()
    setPhase('processing')
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (!uri) throw new Error('No recording captured')
      const path = await uploadMeetingAudio(meetingId, uri)
      await transcribeMeeting(meetingId, path)
      onTranscribed()
    } catch (e) {
      Alert.alert('Transcription failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      nextPause.current = PAUSE_AFTER_SEC
      setPhase('idle')
    }
  }, [recorder, meetingId, onTranscribed])

  // auto-pause at 17 min of recorded time
  useEffect(() => {
    if (phase === 'recording' && recSec >= nextPause.current) {
      recorder.pause()
      setPhase('paused')
      setGrace(GRACE_SEC)
      clearGrace()
      graceTimer.current = setInterval(() => {
        setGrace((g) => {
          if (g <= 1) {
            void finalize()
            return 0
          }
          return g - 1
        })
      }, 1000)
    }
  }, [phase, recSec, recorder, finalize])

  useEffect(() => () => clearGrace(), [])

  async function start() {
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Enable microphone access in Settings to record.')
      return
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      nextPause.current = PAUSE_AFTER_SEC
      setPhase('recording')
    } catch (e) {
      Alert.alert('Could not start recording', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  function resume() {
    clearGrace()
    nextPause.current += PAUSE_AFTER_SEC
    recorder.record()
    setPhase('recording')
  }

  return (
    <>
      <IconButton name="mic-outline" onPress={() => void start()} />

      <Modal visible={open} animationType="fade" transparent={false} onRequestClose={() => {}}>
        <View style={styles.stage}>
          {phase === 'processing' ? (
            <View style={styles.center}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.processing}>Transcribing…</Text>
              <Text style={styles.processingSub}>Deepgram + Claude are writing your summary</Text>
            </View>
          ) : (
            <>
              <View style={styles.center}>
                <Orb level={level} active={phase === 'recording'} />
                <Text style={styles.timer}>{fmt(recSec)}</Text>
                <Text style={styles.hint}>
                  {phase === 'paused' ? 'Paused' : 'Recording — tap stop when done'}
                </Text>
              </View>

              <Pressable
                onPress={() => void finalize()}
                style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.stopSquare} />
                <Text style={styles.stopText}>Stop &amp; transcribe</Text>
              </Pressable>
            </>
          )}

          {phase === 'paused' ? (
            <View style={styles.promptWrap}>
              <View style={styles.prompt}>
                <Text style={styles.promptTitle}>Still recording?</Text>
                <Text style={styles.promptBody}>
                  Paused at {fmt(recSec)}. It stops and transcribes automatically in {fmt(grace)}.
                </Text>
                <View style={styles.promptRow}>
                  <Pressable
                    onPress={() => void finalize()}
                    style={({ pressed }) => [styles.promptBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.promptBtnText}>Stop</Text>
                  </Pressable>
                  <Pressable
                    onPress={resume}
                    style={({ pressed }) => [styles.promptBtnPrimary, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.promptBtnPrimaryText}>Continue</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  )
}

function Orb({ level, active }: { level: number; active: boolean }) {
  const ripple1 = useRef(new Animated.Value(0)).current
  const ripple2 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!active) return
    const mk = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2200, useNativeDriver: true }),
        ]),
      )
    const a = mk(ripple1, 0)
    const b = mk(ripple2, 1100)
    a.start()
    b.start()
    return () => {
      a.stop()
      b.stop()
      ripple1.setValue(0)
      ripple2.setValue(0)
    }
  }, [active, ripple1, ripple2])

  const ampScale = 1 + level * 0.55

  const rippleStyle = (v: Animated.Value) => ({
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
  })

  return (
    <View style={styles.orbArea}>
      <Animated.View style={[styles.ripple, rippleStyle(ripple1)]} />
      <Animated.View style={[styles.ripple, rippleStyle(ripple2)]} />
      <View style={[styles.amp, { transform: [{ scale: ampScale }] }]} />
      <View style={styles.core}>
        <Ionicons name="mic" size={40} color="#fff" />
      </View>
    </View>
  )
}

const ORB = 132

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#060B1E',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 96,
    paddingHorizontal: spacing.xl,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },

  orbArea: { width: ORB * 2.6, height: ORB * 2.6, alignItems: 'center', justifyContent: 'center' },
  ripple: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: '#3B5BDB',
  },
  amp: {
    position: 'absolute',
    width: ORB + 24,
    height: ORB + 24,
    borderRadius: (ORB + 24) / 2,
    backgroundColor: 'rgba(59,91,219,0.35)',
  },
  core: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  timer: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  processing: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: spacing.lg },
  processingSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: spacing.xs, textAlign: 'center' },

  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#EF4444',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
  },
  stopSquare: { width: 14, height: 14, borderRadius: 3, backgroundColor: '#fff' },
  stopText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  promptWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  prompt: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, width: '100%', maxWidth: 360 },
  promptTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  promptBody: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  promptRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  promptBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  promptBtnText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  promptBtnPrimary: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.navy },
  promptBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
