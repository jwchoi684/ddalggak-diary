import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/lib/storage/__tests__/setup.ts'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
