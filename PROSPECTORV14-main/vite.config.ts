import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Comment: Fixed allowedHosts type error. Vite 6 expects 'true' or an array of strings to allow hosts.
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 8080,
      // Comment: Fixed allowedHosts type error. Vite 6 expects 'true' or an array of strings to allow hosts.
      allowedHosts: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});