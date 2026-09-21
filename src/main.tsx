import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { SessionProvider } from "./wallet/session-store";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
