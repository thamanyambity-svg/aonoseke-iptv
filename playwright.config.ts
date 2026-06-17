import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour Aonoseke IPTV Web Player.
 *
 * Lance le serveur Vite automatiquement avant les tests et le ferme après.
 * Tests E2E couvrant les parcours critiques :
 *   1. Chargement de la landing page
 *   2. Mode démo (sans compte)
 *   3. Recherche de chaînes
 *   4. Filtre par pays
 *   5. Ajout aux favoris
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fr-FR',
    timezoneId: 'Africa/Kinshasa',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
