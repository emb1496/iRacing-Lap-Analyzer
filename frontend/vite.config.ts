import react from "@vitejs/plugin-react";
import { createInstrumenter } from "istanbul-lib-instrument";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const srcDir = path.resolve(__dirname, "src") + path.sep;

/**
 * Counts which source lines run, for the Playwright e2e coverage report.
 *
 * It instruments the original TypeScript before Vite transpiles it, the same way Jest does, so
 * both layers' Istanbul data describe the same statements and can be compared line for line.
 * Only used when VITE_COVERAGE=1; never for a build you ship.
 */
function instrumentSource(): Plugin {
  const instrumenter = createInstrumenter({
    esModules: true,
    produceSourceMap: true,
    parserPlugins: ["typescript", "jsx"],
  });
  return {
    name: "instrument-source",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (!file.startsWith(srcDir) || !/\.tsx?$/.test(file)) return;
      if (file.includes(`${path.sep}__tests__${path.sep}`) || file.startsWith(srcDir + "test" + path.sep)) return;
      const instrumented = instrumenter.instrumentSync(code, file);
      return { code: instrumented, map: { ...instrumenter.lastSourceMap(), version: 3 } };
    },
  };
}

export default defineConfig({
  plugins: [react(), process.env.VITE_COVERAGE === "1" && instrumentSource()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
