import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Opt-in polling for source bind-mounted into Docker, where filesystem
      // events from the host often never reach the container.
      watch:
        process.env.CHOKIDAR_USEPOLLING === 'true'
          ? {usePolling: true, interval: 300}
          : undefined,
    },
  };
});
