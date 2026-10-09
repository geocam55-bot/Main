import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '*.config.ts',
        '*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      'sonner@2.0.3': 'sonner',
      'react-hook-form@7.55.0': 'react-hook-form',
      'figma:asset/f99d25ddb222762681abcb651c10ad4a23a854fb.png': path.resolve(__dirname, './src/assets/logo.png'),
      'figma:asset/09aa6b9a364cd19b8e73e23401db6a6a0b182a0e.png': path.resolve(__dirname, './src/assets/logo.png'),
      '@supabase/supabase-js@2': '@supabase/supabase-js',
      '@jsr/supabase__supabase-js@2.49.8': '@jsr/supabase__supabase-js',
      '@jsr/supabase__supabase-js@2': '@jsr/supabase__supabase-js',
      '@': path.resolve(__dirname, './src'),
    },
  },
});
