import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import apiClient from "@/lib/apiClient";

export type AuthUser = { id: string; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem("auth_token");
      const u = localStorage.getItem("auth_user");
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch {}
    setLoading(false);
  }, []);

  const persist = useCallback((u: AuthUser, t: string) => {
    setUser(u);
    setToken(t);
    try {
      localStorage.setItem("auth_token", t);
      localStorage.setItem("auth_user", JSON.stringify(u));
    } catch {}
  }, []);

  const signup = useCallback(
    async (email: string, password: string) => {
      const payload = { email, password };
      const res = await apiClient.post("/auth/signup", payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = res.data as { user: AuthUser; token: string };
      persist(data.user, data.token);
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = { email, password };
      const res = await apiClient.post("/auth/login", payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = res.data as { user: AuthUser; token: string };
      persist(data.user, data.token);
    },
    [persist],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    } catch {}
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signup, login, logout }),
    [user, token, loading, signup, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
