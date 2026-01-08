import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClerkProvider } from "@clerk/clerk-react";
import Index from "./pages/Index";
import Configurator from "./pages/Configurator";
import AdvancedConfigurator from "./pages/AdvancedConfigurator";
import ModeSelection from "./pages/ModeSelection";
import AutoConfigurator from "./pages/AutoConfigurator";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Site from "./pages/Site";
import HostAwareRoot from "./pages/HostAwareRoot";
import TestSite from "./pages/TestSite";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import RequireAuth from "./components/RequireAuth";

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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HelmetProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<HostAwareRoot />} />
                <Route path="/mode-selection" element={<ModeSelection />} />
                <Route path="/configurator" element={<Configurator />} />
                <Route path="/configurator/manual" element={<Configurator />} />
                <Route
                  path="/configurator/auto"
                  element={<AutoConfigurator />}
                />
                <Route
                  path="/configurator/advanced"
                  element={<AdvancedConfigurator />}
                />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
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
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                <Route path="/site/:subdomain/*" element={<Site />} />
                <Route path="/:id/:name/*" element={<Site />} />
                <Route path="/test-site" element={<TestSite />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </HelmetProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
