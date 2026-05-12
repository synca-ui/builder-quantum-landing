import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const AuthenticatedActions = lazy(() => import("./AuthenticatedActions"));
// We'll import ClerkProvider dynamically to keep it out of the main bundle
const ClerkProvider = lazy(() => import("@clerk/clerk-react").then(m => ({ default: m.ClerkProvider })));

function StaticLoginButtons() {
  return (
    <div className="flex items-center space-x-3">
      <a href="/login">
        <Button variant="outline" size="sm">
          Log in
        </Button>
      </a>
      <a href="/signup">
        <Button
          size="sm"
          className="bg-gradient-to-r from-teal-500 to-purple-500 text-white"
        >
          Sign up
        </Button>
      </a>
    </div>
  );
}

export default function LazyAuthSection() {
  const [shouldCheckAuth, setShouldCheckAuth] = useState(false);
  const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    // Check for Clerk session cookie to decide if we should even bother loading the auth library
    // __client_uat is set by Clerk and indicates a session exists if > 0
    const hasClerkCookie = document.cookie.split(';').some(c => c.trim().startsWith('__client_uat='));
    
    // Also load if we've explicitly been to login/signup recently (optional optimization)
    if (hasClerkCookie) {
      setShouldCheckAuth(true);
    } else {
        // Even if no cookie, maybe we want to check after a delay to be safe?
        // For now, let's keep it purely cookie-based for max performance
    }
  }, []);

  if (!shouldCheckAuth || !CLERK_PUBLISHABLE_KEY) {
    return <StaticLoginButtons />;
  }

  return (
    <Suspense fallback={<StaticLoginButtons />}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <AuthenticatedActions />
      </ClerkProvider>
    </Suspense>
  );
}
