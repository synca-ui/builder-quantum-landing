import React from "react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
        {user ? (
          <div className="space-y-4">
            <div className="text-sm"><span className="font-medium">User ID:</span> {user.id}</div>
            <div className="text-sm"><span className="font-medium">Email:</span> {user.email}</div>
            <Button onClick={logout} variant="outline">Log out</Button>
          </div>
        ) : (
          <div>Not logged in.</div>
        )}
      </div>
    </div>
  );
}
