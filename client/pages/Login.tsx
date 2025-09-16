import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation() as any;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const to = location.state?.from?.pathname || "/dashboard";
      nav(to, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4">Log in</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Logging in…" : "Log in"}</Button>
        </form>
        <div className="text-sm text-gray-600 mt-4">No account? <Link to="/signup" className="text-teal-600 font-medium">Sign up</Link></div>
      </div>
    </div>
  );
}
