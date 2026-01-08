import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  if (!isSignedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
