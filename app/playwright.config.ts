import { existsSync } from 'node:fs';
import { chromium, defineConfig, devices } from '@playwright/test';

// Use Playwright's own Chromium when it is installed. Otherwise fall back to
// PW_CHROMIUM_PATH or the cloud container's pre-installed browser, because
// `npx playwright install` cannot download there (cdn.playwright.dev blocked).
function chromiumPath(): string | undefined {
  if (existsSync(chromium.executablePath())) return undefined;
  const candidates = [process.env['PW_CHROMIUM_PATH'], '/opt/pw-browsers/chromium'];
  return candidates.find((p): p is string => !!p && existsSync(p));
}

const executablePath = chromiumPath();

export default defineConfig({
  testDir: './e2e',
  reporter: [['list']],
  use: { headless: true, trace: 'off', baseURL: 'http://localhost:4173/' },
  // Serves the production build (dist/app); `npm run test:e2e` builds it first.
  webServer: { command: 'npm run serve', url: 'http://localhost:4173/', reuseExistingServer: false, timeout: 60_000 },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
});
