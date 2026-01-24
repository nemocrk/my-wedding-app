import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', 
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3001,
    host: true, // Needed for Docker
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        // Error handling robusto per il proxy
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy Error:', err);
            
            // Se la risposta non è stata ancora inviata
            if (!res.headersSent) {
              res.writeHead(502, {
                'Content-Type': 'application/json',
              });
              
              const errorResponse = {
                error: 'Bad Gateway',
                message: `Proxy connection failed: ${err.message}`,
                code: err.code,
                path: req.url,
                timestamp: new Date().toISOString()
              };
              
              res.end(JSON.stringify(errorResponse));
            }
          });
        }
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.tsx',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      exclude: [
        'node_modules',
        'dist',
        '.eslintrc.cjs',
        'vite.config.js',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/main.jsx',
        'src/i18n.js',
        '**/*.d.ts'
      ]
    }
  }
})
