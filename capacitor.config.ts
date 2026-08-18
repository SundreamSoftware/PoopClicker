import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pl.sundreamsoftware.poopclicker',
  appName: 'Poop Clicker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a3a4a',
    },
  },
}

export default config
