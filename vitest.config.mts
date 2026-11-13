import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * vitest.config.mts — tests live next to the code they test, in app/ and lib/,
 * and import with the same "@/" alias as the app (tsconfig.json).
 */
export default defineConfig({
  test: { environment: "node", include: ["app/**/*.test.ts", "lib/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});