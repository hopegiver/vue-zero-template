import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 20000,
  use: {
    baseURL: 'http://localhost:8787',
  },
  webServer: {
    command: 'wrangler dev --port 8787 --live-reload=false --log-level error',
    port: 8787,
    reuseExistingServer: true,
    timeout: 30000,
  },
})
