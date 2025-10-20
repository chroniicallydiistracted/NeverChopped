import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    restoreMocks: true,
  },
  server: {
    port: 3000,
    host: true, // Listen on all addresses including LAN
    open: false, // Don't auto-open browser (causes issues in WSL)
    strictPort: true, // Fail if port 3000 is already in use
    cors: true, // Enable CORS for all origins
    allowedHosts: [
      'sleeper.westfam.media',
      '.westfam.media', // Allow all westfam.media subdomains
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      // Proxy GraphQL to avoid cross-site CORS from the app; Cloudflare tunnel will still reach Vite
      '/api/sleeper/graphql': {
        target: 'https://sleeper.com',
        changeOrigin: true,
        secure: true,
        headers: {
          // Minimize headers to what Sleeper expects
          'Accept': 'application/json',
        },
        rewrite: (path: string) => path.replace(/^\/api\/sleeper\/graphql/, '/graphql'),
      },
      // Add proxy for ESPN data API
      '/api/espn': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      clientPort: 3000, // Ensure HMR works through tunnel
      host: 'sleeper.westfam.media', // HMR connects via the public domain
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Add polyfill configuration for Node.js modules
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['util'],
  },
  resolve: {
    alias: {
      // Provide polyfills for Node.js modules
      'child_process': 'assert',
      'fs': 'assert',
      'path': 'path-browserify',
    }
  }
})
