import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base relativa: la app funciona tanto en GitHub Pages (/cartocor-motores/)
// como en cualquier otra carpeta o servidor sin tocar la configuración.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
