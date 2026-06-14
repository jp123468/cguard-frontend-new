import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  // Defense-in-depth: strip console.*/debugger from production bundles so any
  // stray payload/token logging never reaches the shipped app. esbuild applies
  // `drop` only when minifying (i.e. production builds), leaving dev untouched.
  esbuild: {
    drop: ["console", "debugger"],
  },
  build: {
    // Raise warning threshold — chunks are intentionally split below
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Form + validation
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // UI component library
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-accordion",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
          ],
          // Date utilities
          "vendor-dates": ["date-fns", "react-day-picker"],
          // i18n
          "vendor-i18n": ["i18next", "react-i18next"],
          // Spreadsheet / export
          "vendor-xlsx": ["xlsx"],
          // Phone input
          "vendor-phone": ["libphonenumber-js"],
          // Notifications
          "vendor-toast": ["sonner"],
        },
      },
    },
  },
});
