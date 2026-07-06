import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Cargar el .env de la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Ejecutamos secuencialmente para no pisar la BD en los tests E2E
  reporter: "html",
  timeout: 60000, // 60 segundos por test (API real puede ser lenta)
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Iniciar automáticamente API y WEB antes de correr las pruebas
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: "http://localhost:4000/health",
      cwd: path.resolve(__dirname, "../../"),
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "pnpm --filter web dev",
      url: "http://localhost:3000",
      cwd: path.resolve(__dirname, "../../"),
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
