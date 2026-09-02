import { ImageBackground, StyleSheet, View } from 'react-native'

// Full-screen branded screen — used as the launch / loading state.
export default function BrandScreen() {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/brand-portrait.png')}
        style={styles.bg}
        resizeMode="cover"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#012652' },
  bg: { flex: 1 },
})
