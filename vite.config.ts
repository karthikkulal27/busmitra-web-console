import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Deliberately no tile proxy and no socket. The operator console shows the
// business, not the buses — if it ever needs a live map, that is a decision to
// take on purpose rather than something inherited from the school console.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5175, strictPort: true },
});
