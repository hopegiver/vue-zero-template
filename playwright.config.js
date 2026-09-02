import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 20000,
  use: {
    baseURL: 'http://localhost:8004',
  },
  webServer: {
    command: 'wrangler dev --port 8004 --live-reload=false --log-level error',
    port: 8004,
    reuseExistingServer: true,
    timeout: 30000,
  },
})
