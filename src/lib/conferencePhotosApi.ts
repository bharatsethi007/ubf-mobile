import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'

const BUCKET = 'conferences'

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
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: mime || 'image/jpeg', upsert: true })
  if (upErr) throw upErr

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
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
