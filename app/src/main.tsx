import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./i18n/I18nContext";
import "./index.css";

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
