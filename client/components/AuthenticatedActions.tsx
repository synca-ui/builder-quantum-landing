import { useAuth, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export default function AuthenticatedActions() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return (
      <>
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
      </>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <a href="/dashboard">
        <Button variant="ghost" size="sm" className="font-bold text-teal-600">
          Dashboard
        </Button>
      </a>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
