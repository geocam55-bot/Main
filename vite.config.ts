
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    publicDir: 'src/public',
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
        process.env.GOOGLE_MAPS_PLATFORM_KEY ||
        process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
        ''
      ),
      'process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
        process.env.GOOGLE_MAPS_PLATFORM_KEY ||
        process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
        ''
      ),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(
        process.env.GOOGLE_MAPS_PLATFORM_KEY ||
        process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
        ''
      ),
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
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
    build: {
      target: 'esnext',
      outDir: 'build',
      modulePreload: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          'project-wizards': path.resolve(__dirname, 'project-wizards.html'),
          marketing: path.resolve(__dirname, 'marketing.html'),
          insights: path.resolve(__dirname, 'insights.html'),
          inventory: path.resolve(__dirname, 'inventory.html'),
          it: path.resolve(__dirname, 'it.html'),
          logistics: path.resolve(__dirname, 'logistics.html'),
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      hmr: false,
    },
  });