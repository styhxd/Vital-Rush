import type { CapacitorConfig } from '@capacitor/cli';

// Casca Android do Vital Rush. O jogo é o mesmo build do Vite, embutido no APK.
// Offline: dist/ não pode citar CDN, esm.sh nem fontes do Google.
// WebView abre os arquivos locais (androidScheme https, sem server.url).
// Tela cheia imersiva, tela ligada e vibração ficam no MainActivity; combatBuzz/buzz não se reescrevem.
// Ícone: sprite do Vital, do busto pra cima, fundo transparente no foreground.
// CapacitorUpdater.autoUpdate fica false até existir CAPGO_TOKEN. Sem isso, nenhum servidor no arranque.
// Keystore, senha, local.properties e o APK ficam fora do git. Mudança nativa pede APK novo.

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
