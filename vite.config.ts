import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { talkyHeadsPlugin } from 'talky-heads-sdk/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), talkyHeadsPlugin()],
})
