import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // A9: bibliotecas em pacotes próprios (cache de longo prazo no
        // navegador entre publicações e download em paralelo).
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\/]@?firebase[\/]/ },
            { name: 'react', test: /node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/ },
          ],
        },
      },
    },
  },
})
