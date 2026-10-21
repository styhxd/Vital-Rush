import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'game-css-after-tailwind',
      transformIndexHtml: {
        order: 'post',
        handler(html: string) {
          const link = html.match(/\n\s*<link rel="stylesheet"[^>]*>/);
          if (!link) return html;
          return html.replace(link[0], '').replace('<style>', `${link[0]}\n    <style>`);
        },
      },
    },
  ],
  build: {
    outDir: 'dist',
  }
})