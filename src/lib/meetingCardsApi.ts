import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'
import { fileKey, publicUrl, uploadFile } from './fileStore'

export type MeetingCard = {
  id: string
  meeting_id: string
  image_url: string
  sort_order: number
}

export async function listMeetingCards(meetingId: string): Promise<MeetingCard[]> {
  const { data, error } = await supabase
    .from('meeting_cards')
    .select('id, meeting_id, image_url, sort_order')
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as MeetingCard[]) ?? []
}

export async function uploadMeetingCard(
  meetingId: string,
  base64: string,
  mime: string,
  ext: string,
): Promise<MeetingCard> {
  const path = `business-cards/${meetingId}/${Date.now()}.${ext || 'jpg'}`
  const key = fileKey('conferences', path)
  await uploadFile(key, decode(base64), mime || 'image/jpeg')

  const pub = { publicUrl: publicUrl(key) }
  const { data: existing } = await supabase
    .from('meeting_cards')
    .select('sort_order')
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const sortOrder = ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('meeting_cards')
    .insert({ meeting_id: meetingId, image_url: pub.publicUrl, sort_order: sortOrder })
    .select('id, meeting_id, image_url, sort_order')
    .single()
  if (error) throw error
  return data as MeetingCard
}

export async function deleteMeetingCard(id: string): Promise<void> {
  const { error } = await supabase.from('meeting_cards').delete().eq('id', id)
  if (error) throw error
}
