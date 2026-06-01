import "./global.css";

import { lazy, Suspense, useState, useEffect } from "react";
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
} from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PerformanceErrorBoundary } from "@/components/PerformanceErrorBoundary";
// Clerk is lazy-loaded via LazyAuthWrapper — NOT imported at top level
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Import Service Worker Hook
import { useServiceWorker, useInstallPrompt } from "@/hooks/useServiceWorker";

const Configurator = lazy(() => import("./pages/Configurator"));
const ModeSelection = lazy(() => import("./pages/ModeSelection"));
const CheckLanding = lazy(() => import("./pages/CheckLanding"));
const JulianPortfolio = lazy(() => import("./pages/JulianPortfolio"));
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
const ManageReservation = lazy(() => import("./pages/ManageReservation"));
const CookieBanner = lazy(() => import("./components/cookie-banner"));

// Dashboard Pages (lazy loaded)
const InsightsPage = lazy(() => import("./pages/dashboard/InsightsPage"));
const StaffPage = lazy(() => import("./pages/dashboard/StaffPage"));
const ReservationsDashboard = lazy(() => import("./pages/dashboard/ReservationsDashboard"));
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

// Clerk is lazy-loaded: ~700KB JS only downloaded on auth routes
const AuthWrapper = lazy(() => import("./components/LazyAuthWrapper"));

const App = () => {
  // Register Service Worker and PWA functionality
  useServiceWorker();
  useInstallPrompt();

  // Defer cookie banner until browser is idle (non-render-blocking)
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  useEffect(() => {
    const show = () => setShowCookieBanner(true);
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(show, { timeout: 3000 });
    } else {
      setTimeout(show, 1500);
    }
  }, []);

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
                  <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
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
                      <Route path="/julian-preview" element={<JulianPortfolio />} />

                      {/* Legal Pages */}
                      <Route path="/impressum" element={<Impressum />} />
                      <Route path="/datenschutz" element={<Datenschutz />} />
                      <Route path="/agb" element={<AGB />} />
                      <Route path="/impressum-check" element={<CheckImpressum />} />
                      <Route path="/datenschutz-check" element={<CheckDatenschutz />} />
                      {/* Public Routes */}
                      <Route path="/" element={<HostAwareRoot />} />
                      <Route path="/r/:id" element={<ManageReservation />} />

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
                          path="/dashboard/reservations"
                          element={
                            <RequireAuth>
                              <ReservationsDashboard />
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
            {showCookieBanner && (
              <Suspense fallback={null}>
                <CookieBanner />
              </Suspense>
            )}
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
    // Global error handler for chunk loading issues (e.g., after a new deployment)
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason && (
        event.reason.name === "ChunkLoadError" || 
        event.reason.message?.includes("MIME type") ||
        event.reason.message?.includes("Loading chunk")
      )) {
        console.warn("🔄 Chunk load error detected, forcing reload to get latest version...");
        window.location.reload();
      }
    });

    window.__APP_ROOT__ = createRoot(rootElement);
  }
  window.__APP_ROOT__.render(<App />);
}
