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
    },
  },
});
