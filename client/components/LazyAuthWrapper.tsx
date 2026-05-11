/**
 * LazyAuthWrapper.tsx
 * 
 * This wrapper lazy-loads ClerkProvider so that the ~700KB Clerk bundle
 * is ONLY downloaded when the user navigates to an authenticated route
 * (/login, /signup, /dashboard, /configurator, etc.)
 * 
 * On the landing page (maitr.de), Clerk is never loaded.
 */
import { ClerkProvider } from "@clerk/clerk-react";
import { Outlet } from "react-router-dom";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function LazyAuthWrapper() {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
    return <Outlet />;
  }
  
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Outlet />
    </ClerkProvider>
  );
}
