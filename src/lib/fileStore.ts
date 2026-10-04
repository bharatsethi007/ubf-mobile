// S3 file store via the files-sign edge function (same gateway as the web console).
// Keys are "<area>/<path>". Public areas (conferences) read through a stable redirect URL.
import { supabase } from './supabase'

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
const FN = `${BASE}/functions/v1/files-sign`

export const fileKey = (area: 'conferences' | 'meeting-audio', path: string) =>
  `${area}/${path.replace(/^\/+/, '')}`

/** Upload bytes to S3 through a short-lived presigned PUT. */
export async function uploadFile(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  const jwt = (await supabase.auth.getSession()).data.session?.access_token ?? ANON
  const res = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ op: 'put', keys: [key] }),
  })
  const data = await res.json().catch(() => ({}))
  const url: string | undefined = data?.items?.[0]?.url
  if (!url) throw new Error(data?.items?.[0]?.error ?? data?.message ?? `Upload not allowed (${res.status})`)
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body })
  if (!put.ok) throw new Error(`Upload failed (${put.status})`)
}

/** Stable image URL for public areas. Safe to store in DB and use in <Image>. */
export function publicUrl(key: string): string {
  return `${FN}/o/${key.split('/').map(encodeURIComponent).join('/')}`
}
