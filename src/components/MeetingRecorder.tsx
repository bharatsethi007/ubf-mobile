import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Modal, Pressable, StyleSheet, View } from 'react-native'
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

  if (phase === 'idle') {
    return <IconButton name="mic-outline" onPress={() => void start()} />
  }

  if (phase === 'processing') {
    return (
      <View style={styles.inline}>
        <ActivityIndicator size="small" color={colors.navy} />
        <Text variant="small" style={{ color: colors.navy, fontWeight: '600' }}>
          Transcribing…
        </Text>
      </View>
    )
  }

  return (
    <>
      <View style={styles.inline}>
        <MiniOrb level={level} active={phase === 'recording'} />
        <Text style={styles.timer}>{fmt(recSec)}</Text>
        <Pressable
          onPress={() => void finalize()}
          hitSlop={8}
          style={({ pressed }) => [styles.stop, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.stopSquare} />
        </Pressable>
      </View>

      <Modal visible={phase === 'paused'} transparent animationType="fade" onRequestClose={() => {}}>
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
      </Modal>
    </>
  )
}

function MiniOrb({ level, active }: { level: number; active: boolean }) {
  const ring = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!active) return
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1600, useNativeDriver: true }),
    )
    loop.start()
    return () => {
      loop.stop()
      ring.setValue(0)
    }
  }, [active, ring])

  const scale = 1 + level * 0.35
  const ringStyle = {
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
  }

  return (
    <View style={styles.orbArea}>
      <Animated.View style={[styles.orbRing, ringStyle]} />
      <View style={[styles.orbCore, { transform: [{ scale }] }, !active && styles.orbCoreIdle]} />
    </View>
  )
}

const ORB = 12

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timer: { fontSize: 15, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'], minWidth: 40 },

  orbArea: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  orbRing: { position: 'absolute', width: ORB, height: ORB, borderRadius: ORB / 2, backgroundColor: '#3B5BDB' },
  orbCore: { width: ORB, height: ORB, borderRadius: ORB / 2, backgroundColor: '#EF4444' },
  orbCoreIdle: { backgroundColor: colors.textSubtle },

  stop: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#fff' },

  promptWrap: {
    flex: 1,
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
