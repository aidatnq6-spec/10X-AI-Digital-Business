import { defineConfig } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
export default defineConfig({
  testDir:'./tests/e2e', fullyParallel:false, workers:1,
  outputDir:'.local/e2e-results', reporter:'list', timeout:30000,
  use:{baseURL:'http://127.0.0.1:3201',browserName:'chromium',channel:'chrome',headless:true,trace:'retain-on-failure'},
  webServer:{command:'node scripts/e2e-server.mjs',url:'http://127.0.0.1:3201',reuseExistingServer:false,timeout:60000,
    env:{MISSION_CONTROL_WORKER_PORT:'3211',MISSION_CONTROL_DATA_DIR:join(process.cwd(),'.local','e2e-data',randomUUID())}},
})