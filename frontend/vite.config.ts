// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    // GitHub Pages serves the app from /<repo>/ (e.g. /vigilant-llm-gateway/).
    // Set VITE_BASE_PATH in CI to pin the subpath; defaults to "/" for local dev.
    base: process.env["VITE_BASE_PATH"] || "/",
    server: {
      // Accept any dev-server host (Arena/Lovable previews, tunnels, LAN).
      // The gateway is a local-only demo; no production hardening is affected.
      allowedHosts: true,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Build a static SPA shell so the app can be hosted on GitHub Pages (a
    // static file host with no Node server). The shell is emitted as _shell.html
    // and the workflow copies it to index.html / 404.html for SPA routing.
    spa: { enabled: true },
  },
  // GitHub Pages is static hosting, so skip the Nitro SSR/deploy adapter (which
  // would otherwise emit a Cloudflare worker). npm run dev is unaffected.
  nitro: false,
});
