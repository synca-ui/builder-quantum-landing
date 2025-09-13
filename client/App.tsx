import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Configurator from "./pages/Configurator";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Site from "./pages/Site";
import HostAwareRoot from "./pages/HostAwareRoot";
import TestSite from "./pages/TestSite";

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

import { AuthProvider, useAuth } from './context/AuthProvider';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return children; // simple: let child render while loading
  if (!user) {
    // redirect to home
    window.location.href = '/';
    return null;
  }
  return children;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<HostAwareRoot />} />
              <Route path="/configurator" element={<Configurator />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><TestSite /></RequireAuth>} />
              <Route path="/site/:subdomain/*" element={<Site />} />
              <Route path="/test-site" element={<TestSite />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
