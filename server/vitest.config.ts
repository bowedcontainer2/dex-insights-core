import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      // The source imports '../../../shared/types.js' — resolve .js to .ts
      '../../../shared/types.js': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
});
