import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // DEMO_MODE doit être positionné avant que server/services/proxmoxAPI.js
    // ne soit importé (il lit process.env.DEMO_MODE une seule fois, au
    // chargement du module) — le faire ici plutôt que dans un fichier de
    // test évite le piège du hoisting des imports ES modules.
    env: {
      DEMO_MODE: 'true',
    },
  },
});
