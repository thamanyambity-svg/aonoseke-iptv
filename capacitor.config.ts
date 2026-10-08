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
    allowMixedContent: false,
    backgroundColor: '#0d0a04',
  },
};

export default config;
