import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],

  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'sportingone.site',
      'www.sportingone.site'
    ]
  },

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@asset': path.resolve(import.meta.dirname, './asset'),
      '@component': path.resolve(import.meta.dirname, './component'),
      '@services': path.resolve(import.meta.dirname, './services'),
      '@types': path.resolve(import.meta.dirname, './types')
    }
  }
})
