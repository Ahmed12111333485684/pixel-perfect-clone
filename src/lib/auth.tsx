import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getStoredToken, setStoredToken, type AuthResponse, type Role } from "./api";

interface JwtPayload {
  sub?: string;
  unique_name?: string;
  role?: string | string[];
  screen_permissions?: string;
  owner_id?: string | number;
  partner_id?: string;
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
  screenPermissions: string[];
  ownerId?: number;
  partnerId?: string;
  exp?: number;
}

const AUTH_USER_KEY = "nourconsultancy.user";

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function setStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(AUTH_USER_KEY);
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  isStaff: boolean; // Admin only
  isPartner: boolean;
}

const AuthCtx = createContext<AuthState | null>(null);

function parseScreenPermissions(raw: unknown, fallback: string[] = []): string[] {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to treat raw as plain string below
    }
  }

  if (Array.isArray(raw)) {
    return raw
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return fallback;
}

function normalizeRole(raw?: string | undefined | null): Role | undefined {
  if (!raw) return undefined;
  const r = raw.trim();
  if (!r) return undefined;
  const lower = r.toLowerCase();
  if (lower === "admin") return "Admin";
  if (lower === "employee") return "Employee";
  if (lower === "partner") return "Partner";
  return undefined;
}

function userFromToken(
  token: string,
  fallbackUsername?: string,
  fallbackRole?: Role,
  fallbackScreenPermissions: string[] = [],
): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const rawRole = Array.isArray(payload.role)
    ? String(payload.role[0])
    : typeof payload.role === "string"
      ? payload.role
      : undefined;
  const normalized = normalizeRole(rawRole) ?? normalizeRole(fallbackRole as string) ?? undefined;
  const finalRole = normalized ?? (fallbackRole as Role | undefined) ?? "Partner";
  const tokenUsername = typeof payload.unique_name === "string" ? payload.unique_name.trim() : "";
  const responseUsername = fallbackUsername?.trim();
  const username =
    responseUsername && (!tokenUsername || tokenUsername.toLowerCase() === "user")
      ? responseUsername
      : tokenUsername || responseUsername || "user";
  const ownerIdRaw = payload.owner_id;
  const ownerId = ownerIdRaw !== undefined ? Number(ownerIdRaw) : undefined;
  const partnerIdRaw = payload.partner_id;
  const partnerId = typeof partnerIdRaw === "string" ? partnerIdRaw : undefined;
  return {
    username,
    role: finalRole,
    screenPermissions: parseScreenPermissions(
      payload.screen_permissions,
      fallbackScreenPermissions,
    ),
    ownerId: Number.isNaN(ownerId) ? undefined : ownerId,
    partnerId,
    exp: payload.exp,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      const persistedUser = getStoredUser();
      const u = persistedUser ?? userFromToken(stored);
      if (u && (!u.exp || u.exp * 1000 > Date.now())) {
        setToken(stored);
        setUser(u);
      } else {
        setStoredToken(null);
        setStoredUser(null);
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
    const u = userFromToken(res.token, res.username, res.role, res.screenPermissions) ?? {
      username: res.username,
      role: res.role,
      screenPermissions: res.screenPermissions,
    };
    setToken(res.token);
    setUser(u);
    setStoredUser(u);
    return u;
  };

  const logout = () => {
    setStoredToken(null);
    setStoredUser(null);
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
      isStaff: role === "Admin" || role === "Employee",
      isPartner: role === "Partner",
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
