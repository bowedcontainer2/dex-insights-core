import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '../shared/types.js': path.resolve(__dirname, 'shared/types.ts'),
    },
  },
});
