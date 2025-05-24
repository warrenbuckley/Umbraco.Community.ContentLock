import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Optional: to use Vitest globals without importing
    environment: 'happy-dom', // Use happy-dom for DOM simulation
    setupFiles: [], // We can add setup files here if needed later
  },
});
