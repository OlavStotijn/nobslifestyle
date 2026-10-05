import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./i18n/I18nContext";
import { checkForLiveUpdate } from "./liveUpdate";
import "./index.css";

// Fired before anything else — notifyAppReady() inside this (native-only,
// no-ops on web) must run before any other network request, or the updater
// plugin assumes this bundle failed to load and rolls back to the last one.
checkForLiveUpdate();

// Web only — the native app ships its assets locally and has nothing to
// gain from a service worker, while WKWebView's storage persisting across
// Xcode rebuilds means a stale worker can serve an index.html pointing at JS
// chunks a newer build has already deleted, producing a blank screen.
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

// Both lazy: same SPA bundle ships to nobslifestyle.com and
// admin.nobslifestyle.com (one Worker, one deploy — see wrangler.jsonc's
// routes), but a static import of AdminApp here would pull its Recharts
// usage into every consumer visitor's main bundle regardless of hostname.
// Lazy-loading both means only the tree actually needed downloads.
const App = lazy(() => import("./App"));
const AdminApp = lazy(() => import("./admin/AdminApp").then((m) => ({ default: m.AdminApp })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const isAdminHost = window.location.hostname.startsWith("admin.");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={null}>{isAdminHost ? <AdminApp /> : <App />}</Suspense>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
);
