import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";

// VITE_COVERAGE=1 instruments the bundle so the Playwright e2e run can report which source
// lines the browser actually executed. Never set it for a build you ship.
const instrument = process.env.VITE_COVERAGE === "1";

export default defineConfig({
  plugins: [
    react(),
    instrument &&
      istanbul({
        include: "src/**",
        exclude: ["src/**/__tests__/**", "src/test/**"],
        extension: [".ts", ".tsx"],
        forceBuildInstrument: true, // the plugin only instruments `vite serve` by default
      }),
  ],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
