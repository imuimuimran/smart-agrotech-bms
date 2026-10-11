// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Import the new v4 compiler plugin

// https://vite.dev
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Mount Tailwind directly into the pipeline asset bundle engine
  ],
});
