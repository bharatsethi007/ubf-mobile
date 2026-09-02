import Share from 'react-native-share'
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy'
import { supabase } from './supabase'
import { parseFields } from './meetingNotesApi'

type ShareData = { message: string; photoUrls: string[] }

async function buildShareData(meetingId: string, agentName: string): Promise<ShareData> {
  const [{ data: m }, { data: photos }] = await Promise.all([
    supabase.from('conference_meetings').select('notes_fields, notes').eq('id', meetingId).maybeSingle(),
    supabase
      .from('meeting_photos')
      .select('image_url, sort_order')
      .eq('meeting_id', meetingId)
      .order('sort_order', { ascending: true }),
  ])

  const fields = parseFields(m?.notes_fields, (m?.notes as string | null) ?? null)
  const discussion =
    fields.find((f) => f.label.trim().toLowerCase() === 'discussion')?.value?.trim() ||
    ((m?.notes as string | null) ?? '').trim() ||
    '(no discussion recorded)'

  const photoUrls = (photos ?? []).map((p) => p.image_url as string).filter(Boolean)
  const message = `Meeting notes — ${agentName}\n\n${discussion}`
  return { message, photoUrls }
}

async function downloadPhotos(meetingId: string, urls: string[]): Promise<string[]> {
  const local: string[] = []
  for (let i = 0; i < urls.length; i++) {
    try {
      const ext = (urls[i].split('.').pop() ?? 'jpg').split('?')[0].toLowerCase()
      const dest = `${cacheDirectory}share-${meetingId}-${i}.${ext}`
      const res = await downloadAsync(urls[i], dest)
      local.push(res.uri)
    } catch {
      // skip an unreachable photo
    }
  }
  return local
}

export async function shareMeeting(meetingId: string, agentName: string): Promise<void> {
  const { message, photoUrls } = await buildShareData(meetingId, agentName)
  const urls = await downloadPhotos(meetingId, photoUrls)
  try {
    await Share.open({
      title: `Meeting — ${agentName}`,
      message,
      urls: urls.length ? urls : undefined,
      failOnCancel: false,
    })
  } catch {
    // user cancelled
  }
}
