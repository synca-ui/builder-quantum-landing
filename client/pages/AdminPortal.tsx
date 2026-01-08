import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

export default function AdminPortal() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const token = await getToken();
        const res = await fetch("/api/users/me", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.user?.role === "ADMIN");
        }
      } catch (e) {
        console.error("Failed to fetch user role:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, getToken]);

  if (loading) {
    return <div className="p-6 max-w-3xl mx-auto">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Admin Portal</h1>
      <p className="text-gray-600 mb-6">
        Signed in as {user?.emailAddresses[0]?.emailAddress}
      </p>
      {!isAdmin && (
        <div className="p-4 border rounded text-sm text-amber-700 bg-amber-50">
          You are signed in, but your role is not "admin". Limited access.
        </div>
      )}
      {isAdmin && (
        <div className="p-4 border rounded text-sm text-emerald-700 bg-emerald-50">
          Admin tools will appear here.
        </div>
      )}
    </div>
  );
}
