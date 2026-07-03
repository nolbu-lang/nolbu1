import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 프로젝트 페이지 주소: https://nolbu-lang.github.io/nolbu1/
// 배포(build) 시에는 하위 경로 '/nolbu1/'를, 로컬 개발 시에는 '/'를 사용한다.
const REPO_BASE = '/nolbu1/'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build' ? REPO_BASE : '/'

  return {
    base,
    server: {
      host: true,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons.svg'],
        manifest: {
          name: '심사조서검색',
          short_name: '심사조서',
          description: 'CSV 데이터를 기기에 저장하고 오프라인으로 검색하는 PWA',
          theme_color: '#1a1a2e',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          scope: base,
          start_url: base,
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          navigateFallback: `${base}index.html`,
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
  }
})
