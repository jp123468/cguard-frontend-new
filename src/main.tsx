import React from "react";
import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
// import { Provider } from "./provider.tsx";
// Self-hosted Poppins (bundled — no dependency on the Google Fonts CDN, which can be
// blocked/slow and was leaving the UI on a fallback font). Loaded BEFORE the global
// styles so the @font-face is registered first.
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@/styles/globals.css";
import "@/styles/glass.css";
import { Toaster } from "sonner";
import { ConfirmHost } from "@/components/ui/confirmDialog";

// Stale-deploy recovery: after each publish the hashed chunk files change and
// the old ones are deleted, so a tab loaded BEFORE the deploy 404s on its next
// lazy-route import ("Failed to fetch dynamically imported module"). Vite
// emits vite:preloadError for exactly this — reload once to pick up the new
// build. The sessionStorage stamp (10s window) prevents a reload loop if the
// failure is something else (e.g. offline).
window.addEventListener("vite:preloadError", (event) => {
  const last = Number(sessionStorage.getItem("chunkReloadAt") || 0);
  if (Date.now() - last < 10_000) return; // already retried — let it surface
  sessionStorage.setItem("chunkReloadAt", String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* <BrowserRouter> */}
        <App />
        {/* Platform-styled confirm() replacement (see confirmDialog.tsx). */}
        <ConfirmHost />
        {/* Notifications must sit at the very top of the stacking context so the
            live alert is never hidden behind a dialog/overlay. */}
        <Toaster
          richColors
          expand
          position="top-center"
          duration={8000}
          style={{ zIndex: 2147483647 }}
          toastOptions={{ style: { zIndex: 2147483647 } }}
        />
    {/* </BrowserRouter> */}
  </React.StrictMode>,
);
