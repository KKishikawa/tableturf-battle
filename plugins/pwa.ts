import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

export default function PWA(): Plugin[] {
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'img/apple-touch-icon.png'],
    injectRegister: 'auto',
    manifest: {
      short_name: "ナワバトビルド",
      name: "非公式 ナワバトラーデッキビルダー",
      display: "standalone",
      start_url: ".",
      background_color: "#f3f4f6",
      theme_color: "#7adff4",
      lang: 'ja',
      icons: [{
        src: "img/icon-192.png",
        sizes: "192x192",
      }, {
        src: "img/icon-512.png",
        sizes: "512x512",
      }],
    }
  });
}
