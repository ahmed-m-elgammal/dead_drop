import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Sim sources import the engine by package name; under vitest, resolve it
    // to the engine SOURCE so tests never depend on a prior dist build.
    alias: {
      '@dead-drop/engine': path.resolve(root, 'packages/engine/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
