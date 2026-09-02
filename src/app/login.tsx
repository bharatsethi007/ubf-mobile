import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/lib/auth'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Staff sign in</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#012652" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#012652' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'stretch',
  },
  logo: { width: 180, height: 180, alignSelf: 'center' },
  heading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    opacity: 0.9,
  },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  error: { color: '#FCA5A5', fontSize: 13, marginTop: 2 },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#012652', fontSize: 16, fontWeight: '700' },
})
