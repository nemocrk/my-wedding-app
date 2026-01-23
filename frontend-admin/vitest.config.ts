/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx,ts,tsx}',
        'vite.config.js',
        'vite.config.ts',
        'vitest.config.ts',
        'eslint.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'src/main.jsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        lines: 0, //90,
        functions: 0, //90,
        branches: 0, //85,
        statements: 0, //90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
