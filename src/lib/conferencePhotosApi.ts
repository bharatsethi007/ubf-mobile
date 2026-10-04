import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'
import { fileKey, publicUrl, uploadFile } from './fileStore'

export type ConferencePhoto = {
  id: string
  conference_id: string
  image_url: string
  sort_order: number
}

export async function listConferencePhotos(conferenceId: string): Promise<ConferencePhoto[]> {
  const { data, error } = await supabase
    .from('conference_photos')
    .select('id, conference_id, image_url, sort_order')
    .eq('conference_id', conferenceId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as ConferencePhoto[]) ?? []
}

export async function uploadConferencePhoto(
  conferenceId: string,
  base64: string,
  mime: string,
  ext: string,
): Promise<ConferencePhoto> {
  const path = `conference-photos/${conferenceId}/${Date.now()}.${ext || 'jpg'}`
  const key = fileKey('conferences', path)
  await uploadFile(key, decode(base64), mime || 'image/jpeg')

  const pub = { publicUrl: publicUrl(key) }
  const { data: existing } = await supabase
    .from('conference_photos')
    .select('sort_order')
    .eq('conference_id', conferenceId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const sortOrder = ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('conference_photos')
    .insert({ conference_id: conferenceId, image_url: pub.publicUrl, sort_order: sortOrder })
    .select('id, conference_id, image_url, sort_order')
    .single()
  if (error) throw error
  return data as ConferencePhoto
}

export async function deleteConferencePhoto(id: string): Promise<void> {
  const { error } = await supabase.from('conference_photos').delete().eq('id', id)
  if (error) throw error
}
