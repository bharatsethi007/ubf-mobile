import * as Notifications from 'expo-notifications'
import type { ConferenceMeeting } from './conferencesApi'

const LEAD_MS = 2 * 60 * 1000 // fire 2 minutes before start

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

function startAt(m: ConferenceMeeting): Date {
  // meeting_date "YYYY-MM-DD" + start_time "HH:MM:SS" in local time
  return new Date(`${m.meeting_date}T${m.start_time}`)
}

/**
 * Schedule a "2 minutes before" reminder for every future, non-break,
 * non-cancelled meeting. Clears any previously scheduled reminders first so
 * re-viewing a conference doesn't stack duplicates.
 */
export async function scheduleMeetingReminders(meetings: ConferenceMeeting[]): Promise<number> {
  const ok = await ensureNotificationPermission()
  if (!ok) return 0

  await Notifications.cancelAllScheduledNotificationsAsync()

  const now = Date.now()
  let scheduled = 0
  for (const m of meetings) {
    if (m.is_break || m.status === 'cancelled') continue
    const fireAt = startAt(m).getTime() - LEAD_MS
    if (fireAt <= now) continue
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Next meeting in 2 min',
        body: `${m.agent_name ?? 'Agent'} at ${m.start_time.slice(0, 5)}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
      },
    })
    scheduled++
  }
  return scheduled
}

export async function clearMeetingReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
