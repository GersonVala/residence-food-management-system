import { mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Fuera de tsconfig.node.json a propósito: los tipos de Vite 5 (vitest@2) y Vite 6
// no encajan. Al actualizar a vitest@3 esto puede volver a vite.config.ts.
export default mergeConfig(viteConfig, {
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    clearMocks: true,
    restoreMocks: true,
  },
})
