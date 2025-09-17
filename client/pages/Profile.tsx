import React from "react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users/me", {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("auth_token")
              ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
              : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setFullName(data.user?.full_name || "");
          setCompanyName(data.user?.company_name || "");
        }
      } catch {}
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("auth_token")
            ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
            : {}),
        },
        body: JSON.stringify({ fullName, companyName }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      setMessage("Profile updated");
    } catch (e: any) {
      setMessage(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
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
              <Input
                type="text"
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              {message && (
                <div className={`text-sm ${message === 'Profile updated' ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </div>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </form>

            <Button onClick={logout} variant="outline">
              Log out
            </Button>
          </div>
        ) : (
          <div>Not logged in.</div>
        )}
      </div>
    </div>
  );
}
