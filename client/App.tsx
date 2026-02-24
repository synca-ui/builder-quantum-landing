import "./global.css";

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PerformanceErrorBoundary } from "@/components/PerformanceErrorBoundary";
import { ClerkProvider } from "@clerk/clerk-react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Import Service Worker Hook
import { useServiceWorker, useInstallPrompt } from "@/hooks/useServiceWorker";

const Configurator = lazy(() => import("./pages/Configurator"));
const ModeSelection = lazy(() => import("./pages/ModeSelection"));
const CheckLanding = lazy(() => import("./pages/CheckLanding"));
// Lazy load heavy components for better performance
const AutoConfigurator = lazy(() => import("./pages/AutoConfigurator"));
const Site = lazy(() => import("./pages/Site"));
const TestSite = lazy(() => import("./pages/TestSite"));
import NotFound from "./pages/NotFound";
import HostAwareRoot from "./pages/HostAwareRoot";
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Profile = lazy(() => import("./pages/Profile"));
import RequireAuth from "./components/RequireAuth";

const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const Impressum = lazy(() => import("./pages/Impressum"));
const AGB = lazy(() => import("./pages/AGB"));
const CheckDatenschutz = lazy(() => import("./pages/CheckDatenschutz"));
const CheckImpressum = lazy(() => import("./pages/CheckImpressum"));
import CookieBanner from "./components/cookie-banner";

// Dashboard Pages (lazy loaded)
const InsightsPage = lazy(() => import("./pages/dashboard/InsightsPage"));
const StaffPage = lazy(() => import("./pages/dashboard/StaffPage"));
const FloorPlanPage = lazy(() => import("./pages/dashboard/FloorPlanPage"));
const CreativeStudioPage = lazy(
  () => import("./pages/dashboard/CreativeStudioPage"),
);
const AdminPage = lazy(() => import("./pages/dashboard/AdminPage"));

// Demo Dashboard (public, no auth)
const DemoDashboardHome = lazy(() => import("./pages/demo/DemoDashboardHome"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Add error handling for React Query
      retry: (failureCount, error) => {
        // Don't retry network errors more than once
        if (
          error instanceof Error &&
          error.message.includes("Failed to fetch")
        ) {
          return failureCount < 1;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const AuthWrapper = () => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Outlet />
    </ClerkProvider>
  );
};

const App = () => {
  // Register Service Worker and PWA functionality
  useServiceWorker();
  useInstallPrompt();

  return (
    <PerformanceErrorBoundary>
      <ErrorBoundary>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <HelmetProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                  <Suspense
                    fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="loading-spinner"></div>
                      </div>
                    }
                  >
                    <Routes>
                      {/* Demo Dashboard Routes (Public - No Auth Required) */}
                      <Route
                        path="/demo-dashboard"
                        element={<DemoDashboardHome />}
                      />
                      <Route
                        path="/demo-dashboard/*"
                        element={<DemoDashboardHome />}
                      />

                      {/* Check Landing Page Preview (local dev) */}
                      <Route path="/check-landing" element={<CheckLanding />} />

                      {/* Legal Pages */}
                      <Route path="/impressum" element={<Impressum />} />
                      <Route path="/datenschutz" element={<Datenschutz />} />
                      <Route path="/agb" element={<AGB />} />
                      <Route path="/impressum-check" element={<CheckImpressum />} />
                      <Route path="/datenschutz-check" element={<CheckDatenschutz />} />
                      {/* Public Routes */}
                      <Route path="/" element={<HostAwareRoot />} />

                      {/* CLERK AUTHENTICATED ROUTES */}
                      <Route element={<AuthWrapper />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route
                          path="/mode-selection"
                          element={<ModeSelection />}
                        />
                        <Route
                          path="/configurator"
                          element={<Configurator />}
                        />
                        <Route
                          path="/configurator/manual"
                          element={<Configurator />}
                        />
                        <Route
                          path="/configurator/auto"
                          element={<AutoConfigurator />}
                        />

                        {/* Dashboard Routes */}
                        <Route
                          path="/dashboard/insights"
                          element={
                            <RequireAuth>
                              <InsightsPage />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/dashboard/staff"
                          element={
                            <RequireAuth>
                              <StaffPage />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/dashboard/floor-plan"
                          element={
                            <RequireAuth>
                              <FloorPlanPage />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/dashboard/creative"
                          element={
                            <RequireAuth>
                              <CreativeStudioPage />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/dashboard/admin"
                          element={
                            <RequireAuth>
                              <AdminPage />
                            </RequireAuth>
                          }
                        />

                        <Route
                          path="/profile"
                          element={
                            <RequireAuth>
                              <Profile />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <Navigate to="/dashboard/insights" replace />
                          }
                        />
                      </Route>

                      <Route path="/site/:subdomain/*" element={<Site />} />
                      <Route path="/:id/:name/*" element={<Site />} />
                      <Route path="/test-site" element={<TestSite />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </HelmetProvider>
            <CookieBanner />
          </QueryClientProvider>
        </I18nextProvider>
      </ErrorBoundary>
    </PerformanceErrorBoundary>
  );
};

// Store root instance globally
declare global {
  interface Window {
    __APP_ROOT__?: ReturnType<typeof createRoot>;
  }
}

// Mount app
const rootElement = document.getElementById("root");
if (rootElement) {
  if (!window.__APP_ROOT__) {
    window.__APP_ROOT__ = createRoot(rootElement);
  }
  window.__APP_ROOT__.render(<App />);
}
