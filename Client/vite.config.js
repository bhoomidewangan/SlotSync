import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiUrl = env.VITE_API_URL?.trim()
  const timeout = Number(env.VITE_API_TIMEOUT_MS)

  if (!apiUrl) throw new Error('VITE_API_URL is required.')
  if (/YOUR-|REPLACE_/i.test(apiUrl)) {
    throw new Error('VITE_API_URL still contains a placeholder value.')
  }
  let backendOrigin
  try {
    backendOrigin = new URL(apiUrl).origin
  } catch {
    throw new Error('VITE_API_URL must be a valid absolute URL.')
  }
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new Error('VITE_API_TIMEOUT_MS must be a positive integer.')
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})
