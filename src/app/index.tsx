import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/lib/auth'

const NAVY = '#0A2472'

export default function HomeScreen() {
  const { session, signOut } = useAuth()
  const email = session?.user.email ?? ''

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>UB Freight</Text>
        <TouchableOpacity onPress={() => void signOut()} activeOpacity={0.7}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.hello}>Signed in</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conferences</Text>
          <Text style={styles.cardText}>The conference module lands here next.</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  brand: { fontSize: 18, fontWeight: '700', color: NAVY },
  signOut: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  body: { flex: 1, padding: 20, gap: 6 },
  hello: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280' },
  card: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: NAVY },
  cardText: { fontSize: 14, color: '#6b7280', marginTop: 4 },
})
