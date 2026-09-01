import { useAuth } from '@/lib/auth'
import { AppHeader, Badge, Button, Card, Screen, Text } from '@/components/kit'
import { colors, spacing } from '@/theme'
import { View } from 'react-native'

export default function HomeScreen() {
  const { session, signOut } = useAuth()
  const email = session?.user.email ?? ''

  return (
    <Screen>
      <AppHeader
        title="UB Freight"
        right={<Button title="Sign out" variant="ghost" onPress={() => void signOut()} style={{ minHeight: 0, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }} />}
      />
      <View style={{ padding: spacing.lg, gap: spacing.xs }}>
        <Text variant="title">Signed in</Text>
        {email ? <Text variant="muted">{email}</Text> : null}

        <Card style={{ marginTop: spacing.lg, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="heading">Conferences</Text>
            <Badge label="Soon" tone="muted" />
          </View>
          <Text variant="muted">The conference module lands here next.</Text>
        </Card>
      </View>
    </Screen>
  )
}
