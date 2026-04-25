import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getStoredToken, setStoredToken, type AuthResponse, type Role } from "./api";

interface JwtPayload {
  sub?: string;
  unique_name?: string;
  role?: string | string[];
  owner_id?: string | number;
  exp?: number;
  [k: string]: unknown;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

interface AuthUser {
  username: string;
  role: Role;
  ownerId?: number;
  exp?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  isStaff: boolean; // Admin or AgencyOwner
}

const AuthCtx = createContext<AuthState | null>(null);

function userFromToken(token: string, fallbackUsername?: string, fallbackRole?: Role): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const role = (Array.isArray(payload.role) ? payload.role[0] : payload.role) as Role | undefined;
  const finalRole = (role ?? fallbackRole ?? "OwnerClient") as Role;
  const username = (payload.unique_name as string) ?? fallbackUsername ?? "user";
  const ownerIdRaw = payload.owner_id;
  const ownerId = ownerIdRaw !== undefined ? Number(ownerIdRaw) : undefined;
  return { username, role: finalRole, ownerId: Number.isNaN(ownerId) ? undefined : ownerId, exp: payload.exp };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      const u = userFromToken(stored);
      if (u && (!u.exp || u.exp * 1000 > Date.now())) {
        setToken(stored);
        setUser(u);
      } else {
        setStoredToken(null);
      }
    }
    setBootstrapped(true);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { username, password },
      anonymous: true,
    });
    setStoredToken(res.token);
    const u = userFromToken(res.token, res.username, res.role) ?? {
      username: res.username,
      role: res.role,
    };
    setToken(res.token);
    setUser(u);
    return u;
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthState>(() => {
    const role = user?.role;
    return {
      isAuthenticated: !!token && !!user,
      user,
      token,
      login,
      logout,
      hasRole: (r) => role === r,
      hasAnyRole: (rs) => !!role && rs.includes(role),
      isStaff: role === "Admin" || role === "AgencyOwner",
    };
  }, [token, user]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
