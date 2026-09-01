import { supabase } from './supabase'
import { parseFields } from './meetingNotesApi'

export async function buildMeetingShareMessage(
  meetingId: string,
  agentName: string,
): Promise<string> {
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

  const urls = (photos ?? []).map((p) => p.image_url as string).filter(Boolean)

  const parts = [`Meeting notes — ${agentName}`, '', discussion]
  if (urls.length) parts.push('', 'Photos:', ...urls)
  return parts.join('\n')
}
