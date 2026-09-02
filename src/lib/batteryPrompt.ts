import { Alert, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as IntentLauncher from 'expo-intent-launcher'

const KEY = 'batteryPromptShown_v1'
const PKG = 'com.ubfreight.ubfmobile'

/**
 * On Android, aggressive battery optimization (Samsung/Xiaomi/etc.) can delay or
 * drop scheduled meeting reminders. Show a one-time nudge to set the app to
 * Unrestricted, with a shortcut to the app's settings.
 */
export async function maybePromptBatteryOptimization(): Promise<void> {
  if (Platform.OS !== 'android') return
  try {
    const shown = await AsyncStorage.getItem(KEY)
    if (shown) return
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    return
  }

  Alert.alert(
    'Keep reminders on time',
    'For meeting reminders to fire reliably, set this app’s battery usage to “Unrestricted” in Settings.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
            { data: `package:${PKG}` },
          ).catch(() => {})
        },
      },
    ],
  )
}
