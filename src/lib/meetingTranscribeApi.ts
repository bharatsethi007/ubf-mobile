import { readAsStringAsync } from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'
import { fileKey, uploadFile } from './fileStore'

export async function uploadMeetingAudio(meetingId: string, uri: string): Promise<string> {
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' })
  const ext = (uri.split('.').pop() ?? 'm4a').split('?')[0].toLowerCase()
  const path = `${meetingId}/${Date.now()}.${ext}`
  const contentType = ext === 'm4a' || ext === 'mp4' ? 'audio/mp4' : ext === 'aac' ? 'audio/aac' : 'audio/mpeg'
  // Returns the S3 key; meeting-transcribe reads it as audio_key.
  const key = fileKey('meeting-audio', path)
  await uploadFile(key, decode(base64), contentType)
  return key
}

export async function transcribeMeeting(meetingId: string, audioPath: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('meeting-transcribe', {
    body: { meeting_id: meetingId, audio_key: audioPath },
  })
  if (error) throw error
  if (data && (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string }).error ?? 'Transcription failed')
  }
}
