import { lazy, Suspense } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

const AuthenticatedActions = lazy(() => import("./AuthenticatedActions"));

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
  const { isLoaded, isSignedIn } = useAuth();

  // While Clerk is initialising, show static buttons
  if (!isLoaded) {
    return <StaticLoginButtons />;
  }

  if (!isSignedIn) {
    return <StaticLoginButtons />;
  }

  // User is signed in — lazy-load the richer actions component
  return (
    <Suspense fallback={<StaticLoginButtons />}>
      <AuthenticatedActions />
    </Suspense>
  );
}
