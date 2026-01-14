import React from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Profile() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(
        user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "",
      );
    }
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fullName }),
      });
      if (!res.ok) throw new Error("Failed to update profile");

      // Critical: Refresh Clerk's cached user object after successful update
      // This ensures the UI reflects the new name immediately and on subsequent navigations
      if (user) {
        await user.reload();
      }

      setMessage("Profile updated");
    } catch (e: any) {
      setMessage(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-2xl font-black text-gradient">
                Maitr
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600 font-medium">Profile</span>
            </div>
            <Link to="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6 w-full">
          <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
          {user ? (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">User ID:</span> {user.id}
              </div>
              <div className="text-sm">
                <span className="font-medium">Email:</span> {user.email}
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <Input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {message && (
                  <div
                    className={`text-sm ${message === "Profile updated" ? "text-green-600" : "text-red-600"}`}
                  >
                    {message}
                  </div>
                )}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </form>

              <Button onClick={() => signOut()} variant="outline">
                Log out
              </Button>

              {/* Emergency Reset Button - Clears all cached data */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">
                  Having sync issues? Clear the cache and reload.
                </p>
                <Button
                  onClick={() => {
                    if (
                      confirm(
                        "This will clear all cached data and reload the page. Continue?",
                      )
                    ) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }}
                  variant="outline"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  Clear Cache & Reload
                </Button>
              </div>
            </div>
          ) : (
            <div>Not logged in.</div>
          )}
        </div>
      </div>
    </div>
  );
}
