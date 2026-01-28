/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/__tests__/',
        '**/*.test.{js,jsx,ts,tsx}',
        'vite.config.js',
        'vite.config.ts',
        'vitest.config.ts',
        'eslint.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'src/main.jsx',
        'src/vite-env.d.ts',
        'src/assets/illustrations',
        '*.css',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        perFile: false,
      },
    },
  },
});
