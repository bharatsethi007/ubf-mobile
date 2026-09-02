import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AuthProvider, useAuth } from '@/lib/auth'
import BrandScreen from '@/components/BrandScreen'

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
  const { loading } = useAuth()
  useProtectedRoute()
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
      </Stack>
      {loading ? <BrandScreen /> : null}
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
