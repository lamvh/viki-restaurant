import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" alias so imports resolve under Vitest.
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // `server-only` throws on import outside an RSC context, which would make
      // every server module untestable. The real guard still applies at build.
      'server-only': fileURLToPath(new URL('./vitest.server-only-stub.ts', import.meta.url)),
    },
  },
});
