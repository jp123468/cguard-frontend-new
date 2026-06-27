import React from "react";
import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
// import { Provider } from "./provider.tsx";
import "@/styles/globals.css";
import "@/styles/glass.css";
import { Toaster } from "sonner";
import { ConfirmHost } from "@/components/ui/confirmDialog";

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
