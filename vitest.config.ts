import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/store/**/*.ts'],
      exclude: ['src/lib/firebase.ts', 'src/store/useAuthStore.ts', '**/*.test.ts'],
    },
  },
});
