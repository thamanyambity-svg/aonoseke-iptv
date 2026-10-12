import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aonoseke.iptv',
  appName: 'Aonoseke IPTV',
  webDir: 'dist',
  backgroundColor: '#0d0a04',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Autorise les flux http:// (chaînes qui n'ont pas de version https). Sur le web, ces chaînes sont masquées.
    allowMixedContent: true,
    backgroundColor: '#0d0a04',
  },
};

export default config;
