import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

/**
 * Das Rücksprungziel muss als ?redirect_url= in der Login-URL stehen: Clerk
 * liest es von dort und reicht es durch alle Schritte (Passwort, 2FA-Code,
 * Social-Login, Wechsel zur Registrierung) bis zum setActive durch. Ein
 * router-state `from` sieht Clerk nicht – damit landete man nach dem letzten
 * Schritt immer auf fallbackRedirectUrl="/".
 */
export function loginUrlFor(location: {
  pathname: string;
  search: string;
  hash: string;
}) {
  const ziel = `${location.pathname}${location.search}${location.hash}`;
  return `/login?redirect_url=${encodeURIComponent(ziel)}`;
}

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
  if (!isSignedIn) return <Navigate to={loginUrlFor(location)} replace />;
  return <>{children}</>;
}
