import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
    allowedHosts: true,
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
})
