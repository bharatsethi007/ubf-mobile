import { supabase } from './supabase'

export type NoteField = { id: string; label: string; value: string }

export const DEFAULT_FIELD_LABELS = [
  'Key business',
  'Area of business',
  'Strengths',
  'Discussion',
  'Remarks',
  'Follow up',
] as const

export const LARGE_FIELDS = new Set<string>(['Discussion'])
export const HALF_FIELDS = new Set<string>(['Key business', 'Area of business'])
export const ONE_LINE_FIELDS = new Set<string>(['Strengths'])

export function newId(): string {
  return `f_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function makeDefaultFields(seedDiscussion?: string | null): NoteField[] {
  return DEFAULT_FIELD_LABELS.map((label) => ({
    id: newId(),
    label,
    value: label === 'Discussion' && seedDiscussion ? seedDiscussion : '',
  }))
}

export function parseFields(raw: unknown, notes: string | null): NoteField[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map((f) => ({
        id: typeof f.id === 'string' ? f.id : newId(),
        label: typeof f.label === 'string' ? f.label : '',
        value: typeof f.value === 'string' ? f.value : '',
      }))
  }
  return makeDefaultFields(notes)
}

export function flattenFields(fields: NoteField[]): string {
  return fields
    .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
    .filter((f) => f.value)
    .map((f) => (f.label ? `${f.label}: ${f.value}` : f.value))
    .join('\n')
}

export async function fetchMeetingNotes(meetingId: string): Promise<NoteField[]> {
  const { data, error } = await supabase
    .from('conference_meetings')
    .select('notes_fields, notes')
    .eq('id', meetingId)
    .maybeSingle()
  if (error) throw error
  return parseFields(data?.notes_fields, (data?.notes as string | null) ?? null)
}

export async function saveMeetingNotes(meetingId: string, fields: NoteField[]): Promise<void> {
  const flat = flattenFields(fields)
  const { error } = await supabase
    .from('conference_meetings')
    .update({ notes_fields: fields, notes: flat.trim() ? flat : null, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
  if (error) throw error
}
