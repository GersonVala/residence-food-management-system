import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://fundacion:1234@localhost:5432/fundacion_test",
      JWT_SECRET: process.env.JWT_SECRET ?? "test-secret",
      JWT_EXPIRES_IN: "7d",
      FRONTEND_URL: "http://localhost:3000",
    },
    // Pool forks: aísla cada archivo de test en un proceso separado.
    // Necesario con Fastify para evitar conflictos de estado entre suites.
    pool: "forks",
    // Timeout elevado para tests de integración con DB real
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Tests secuenciales: evita problemas de concurrencia en la DB de test
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "src/index.ts"],
    },
  },
});
