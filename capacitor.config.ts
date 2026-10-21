import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.estudiocria.vitalrush',
  appName: 'Vital Rush',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
      backgroundColor: '#00000000',
    },
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
};

export default config;
