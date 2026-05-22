import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // Raise expect() assertion timeout to 15 s.
  // Next.js compiles routes on first request after startup; give enough
  // headroom for the cold-start compilation to finish before assertions fire.
  expect: { timeout: 15_000 },
  // Run all tests sequentially (single worker) to avoid parallel page.goto()
  // calls racing against Next.js's initial route compilation on a cold start.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    // Port 3001: avoids conflict with VS Code extension host which binds
    // 127.0.0.1:3000 and intercepts Playwright's IPv4 health-check requests.
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    // Allow up to 15 s for page.goto() and navigation actions.
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Bind Next.js to port 3001 to avoid the VS Code extension-host conflict.
    command: 'next dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Pipe stdout so the wait pattern can match against it.
    stdout: 'pipe',
    // Only declare the server ready once Next.js logs "Ready in".
    // This prevents the health check from passing on the intermediate
    // dev-placeholder page that Next.js serves before compilation finishes.
    wait: { stdout: /Ready in/ },
  },
});
