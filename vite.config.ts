import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the app under /<repo-name>/, so we set base
// for production builds. Dev server uses '/' as usual.
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  base: isGitHubPages ? '/MLBTheShow26SeasonCompanion/' : '/',
  plugins: [react(), tailwindcss()],
})
