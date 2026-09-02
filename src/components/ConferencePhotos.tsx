import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'

import { Text } from '@/components/kit'
import { colors, radius, spacing } from '@/theme'
import {
  deleteConferencePhoto,
  listConferencePhotos,
  uploadConferencePhoto,
  type ConferencePhoto,
} from '@/lib/conferencePhotosApi'

export default function ConferencePhotos({ conferenceId }: { conferenceId: string }) {
  const [photos, setPhotos] = useState<ConferencePhoto[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    listConferencePhotos(conferenceId)
      .then((p) => {
        if (active) setPhotos(p)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [conferenceId])

  async function handle(source: 'camera' | 'library') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Enable it in Settings to add photos.')
      return
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true }
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts)
    if (res.canceled) return
    const asset = res.assets[0]
    if (!asset?.base64) return
    setBusy(true)
    try {
      const ext = (asset.uri.split('.').pop() ?? 'jpg').split('?')[0].toLowerCase()
      const photo = await uploadConferencePhoto(conferenceId, asset.base64, asset.mimeType ?? 'image/jpeg', ext)
      setPhotos((prev) => [...prev, photo])
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function onAdd() {
    Alert.alert('Add conference photo', undefined, [
      { text: 'Take photo', onPress: () => void handle('camera') },
      { text: 'Choose from library', onPress: () => void handle('library') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function onDelete(id: string) {
    Alert.alert('Remove photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteConferencePhoto(id)
            .then(() => setPhotos((prev) => prev.filter((p) => p.id !== id)))
            .catch((e) => Alert.alert('Could not remove', e instanceof Error ? e.message : 'Try again.'))
        },
      },
    ])
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.head}>
        <Text variant="label">Conference photos</Text>
        <Pressable onPress={onAdd} disabled={busy} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={16} color={colors.navy} />
              <Text style={{ color: colors.navy, fontWeight: '600', fontSize: 13 }}>Add photo</Text>
            </>
          )}
        </Pressable>
      </View>

      {photos.length === 0 ? (
        <Text variant="muted">No conference photos yet.</Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <View key={p.id} style={styles.thumbWrap}>
              <Image source={{ uri: p.image_url }} style={styles.thumb} contentFit="cover" />
              <Pressable style={styles.del} onPress={() => onDelete(p.id)} hitSlop={8}>
                <Ionicons name="close" size={13} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.navy,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 34,
    minWidth: 96,
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  del: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
