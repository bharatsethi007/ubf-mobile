import { supabase } from './supabase'

export type ConferenceBucket = 'current' | 'upcoming' | 'past'

export type ConferenceCard = {
  id: string
  name: string
  network_code: string | null
  location_name: string | null
  start_date: string
  end_date: string
  cover_image_url: string | null
  default_meeting_minutes: number
  meeting_count: number
}

type Row = {
  id: string
  name: string
  location_name: string | null
  start_date: string
  end_date: string
  cover_image_url: string | null
  default_meeting_minutes: number
  freight_networks: { code: string } | null
}

export function conferenceBucket(c: { start_date: string; end_date: string }): ConferenceBucket {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(`${c.start_date}T00:00:00`)
  const end = new Date(`${c.end_date}T00:00:00`)
  end.setHours(23, 59, 59, 999)
  if (today >= start && today <= end) return 'current'
  if (today < start) return 'upcoming'
  return 'past'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDateRange(startISO: string, endISO: string): string {
  const s = new Date(`${startISO}T00:00:00`)
  const e = new Date(`${endISO}T00:00:00`)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) return `${s.getDate()}–${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
  const sameYear = s.getFullYear() === e.getFullYear()
  const left = `${s.getDate()} ${MONTHS[s.getMonth()]}${sameYear ? '' : ` ${s.getFullYear()}`}`
  const right = `${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
  return `${left} – ${right}`
}

export async function listConferences(): Promise<ConferenceCard[]> {
  const [{ data, error }, { data: meetings, error: mErr }] = await Promise.all([
    supabase
      .from('conferences')
      .select(
        'id, name, location_name, start_date, end_date, cover_image_url, default_meeting_minutes, freight_networks(code)',
      )
      .order('start_date', { ascending: false }),
    supabase.from('conference_meetings').select('conference_id'),
  ])
  if (error) throw error
  if (mErr) throw mErr

  const counts = new Map<string, number>()
  for (const row of meetings ?? []) {
    const id = row.conference_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    network_code: r.freight_networks?.code ?? null,
    location_name: r.location_name,
    start_date: r.start_date,
    end_date: r.end_date,
    cover_image_url: r.cover_image_url,
    default_meeting_minutes: r.default_meeting_minutes,
    meeting_count: counts.get(r.id) ?? 0,
  }))
}

export async function fetchConference(id: string): Promise<ConferenceCard | null> {
  const { data, error } = await supabase
    .from('conferences')
    .select(
      'id, name, location_name, start_date, end_date, cover_image_url, default_meeting_minutes, freight_networks(code)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as unknown as Row
  const { count } = await supabase
    .from('conference_meetings')
    .select('id', { count: 'exact', head: true })
    .eq('conference_id', id)
  return {
    id: r.id,
    name: r.name,
    network_code: r.freight_networks?.code ?? null,
    location_name: r.location_name,
    start_date: r.start_date,
    end_date: r.end_date,
    cover_image_url: r.cover_image_url,
    default_meeting_minutes: r.default_meeting_minutes,
    meeting_count: count ?? 0,
  }
}

/* ---------------- Meetings (agents) ---------------- */

export type MeetingStatus = 'upcoming' | 'completed' | 'cancelled' | 'no_show'

export type ConferenceMeeting = {
  id: string
  meeting_date: string
  start_time: string
  end_time: string
  agent_name: string | null
  status: MeetingStatus
  is_break: boolean
}

type MeetingRow = {
  id: string
  meeting_date: string
  start_time: string
  end_time: string
  status: MeetingStatus
  is_break: boolean
  manual_agent_name: string | null
  agents: { name: string } | null
}

export function hhmm(t: string): string {
  // "09:00:00" -> "9:00"
  const [h, m] = t.split(':')
  const hour = Number(h)
  return `${hour}:${m ?? '00'}`
}

export function dayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function conferenceDays(startISO: string, endISO: string): string[] {
  const out: string[] = []
  const cur = new Date(`${startISO}T00:00:00`)
  const end = new Date(`${endISO}T00:00:00`)
  while (cur <= end) {
    out.push(localISO(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export function defaultActiveDay(startISO: string, endISO: string): string {
  const days = conferenceDays(startISO, endISO)
  const today = localISO(new Date())
  return days.includes(today) ? today : days[0]
}

export async function listConferenceMeetings(conferenceId: string): Promise<ConferenceMeeting[]> {
  const { data, error } = await supabase
    .from('conference_meetings')
    .select('id, meeting_date, start_time, end_time, status, is_break, manual_agent_name, agents(name)')
    .eq('conference_id', conferenceId)
    .order('meeting_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error
  return ((data as unknown as MeetingRow[]) ?? []).map((r) => ({
    id: r.id,
    meeting_date: r.meeting_date,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    is_break: r.is_break,
    agent_name: r.agents?.name ?? r.manual_agent_name ?? null,
  }))
}

export async function updateMeetingStatus(meetingId: string, status: MeetingStatus): Promise<void> {
  const { error } = await supabase
    .from('conference_meetings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
  if (error) throw error
}
