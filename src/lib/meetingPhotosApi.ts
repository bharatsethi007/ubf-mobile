import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'

const BUCKET = 'conferences'

export type MeetingPhoto = {
  id: string
  meeting_id: string
  image_url: string
  sort_order: number
}

export async function listMeetingPhotos(meetingId: string): Promise<MeetingPhoto[]> {
  const { data, error } = await supabase
    .from('meeting_photos')
    .select('id, meeting_id, image_url, sort_order')
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as MeetingPhoto[]) ?? []
}

export async function uploadMeetingPhoto(
  meetingId: string,
  base64: string,
  mime: string,
  ext: string,
): Promise<MeetingPhoto> {
  const path = `meeting-photos/${meetingId}/${Date.now()}.${ext || 'jpg'}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: mime || 'image/jpeg', upsert: true })
  if (upErr) throw upErr

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data: existing } = await supabase
    .from('meeting_photos')
    .select('sort_order')
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const sortOrder = ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('meeting_photos')
    .insert({ meeting_id: meetingId, image_url: pub.publicUrl, sort_order: sortOrder })
    .select('id, meeting_id, image_url, sort_order')
    .single()
  if (error) throw error
  return data as MeetingPhoto
}

export async function deleteMeetingPhoto(id: string): Promise<void> {
  const { error } = await supabase.from('meeting_photos').delete().eq('id', id)
  if (error) throw error
}
