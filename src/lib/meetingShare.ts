import Share from 'react-native-share'
import { cacheDirectory, downloadAsync, writeAsStringAsync } from 'expo-file-system/legacy'
import { supabase } from './supabase'
import { parseFields } from './meetingNotesApi'

const COMPANY = 'UB Freight'
const WEBSITE = 'https://www.ubfreight.com'

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

function vcardEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

// Build a .vcf for the signed-in staff member from their profile; returns a
// local file uri, or null if it couldn't be built.
async function buildOwnVCard(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return null
    const { data: prof } = await supabase
      .from('staff_users')
      .select('full_name, job_title, phone, email')
      .eq('user_id', user.id)
      .maybeSingle()

    const name = (prof?.full_name as string | null)?.trim() || ''
    const title = (prof?.job_title as string | null)?.trim() || ''
    const phone = (prof?.phone as string | null)?.trim() || ''
    const email = ((prof?.email as string | null) || user.email || '').trim()

    const lines = ['BEGIN:VCARD', 'VERSION:3.0']
    if (name) {
      lines.push(`N:${vcardEscape(name)};;;;`)
      lines.push(`FN:${vcardEscape(name)}`)
    }
    lines.push(`ORG:${vcardEscape(COMPANY)}`)
    if (title) lines.push(`TITLE:${vcardEscape(title)}`)
    if (phone) lines.push(`TEL;TYPE=CELL:${vcardEscape(phone)}`)
    if (email) lines.push(`EMAIL;TYPE=WORK:${vcardEscape(email)}`)
    lines.push(`URL:${WEBSITE}`)
    lines.push('END:VCARD')

    if (!name && !email) return null // nothing meaningful to share

    const uri = `${cacheDirectory}ubf-contact.vcf`
    await writeAsStringAsync(uri, lines.join('\r\n'))
    return uri
  } catch {
    return null
  }
}

export async function shareMeeting(meetingId: string, agentName: string): Promise<void> {
  const { message, photoUrls } = await buildShareData(meetingId, agentName)
  const urls = await downloadPhotos(meetingId, photoUrls)
  const vcard = await buildOwnVCard()
  if (vcard) urls.push(vcard)

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
