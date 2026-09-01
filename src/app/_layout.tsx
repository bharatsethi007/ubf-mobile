import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AuthProvider, useAuth } from '@/lib/auth'

function useProtectedRoute() {
  const { session, staff, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inLogin = segments[0] === 'login'
    const authed = !!session && staff
    if (!authed && !inLogin) router.replace('/login')
    else if (authed && inLogin) router.replace('/')
  }, [session, staff, loading, segments, router])
}

function RootNavigator() {
  const colorScheme = useColorScheme()
  useProtectedRoute()
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
      </Stack>
    </ThemeProvider>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
