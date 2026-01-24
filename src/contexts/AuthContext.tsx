import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthService, LoginCredentials, SignUpData } from "../services/auth/authService";
import { setAuthToken, clearAuthToken } from "@/lib/api";
import { setTenantId as setClientServiceTenantId } from "@/lib/api/clientService";
import { setTenantId as setCategoryTenantId } from "@/lib/api/categoryService";
import { ApiError } from "../services/api/apiService";

interface User { id?: string; email: string; permissions?: string[]; [k: string]: any }
interface AuthResult { success: boolean; error?: string; needVerification?: boolean }
interface AuthContextType {
  user: User | null; loading: boolean; error: string | null;
  signIn: (c: LoginCredentials) => Promise<AuthResult>;
  signUp: (d: SignUpData) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  // permite iniciar sesión usando un token (por ejemplo OAuth callback)
  signInWithToken: (token: string, user?: any) => Promise<AuthResult>;
  isAuthenticated: boolean;
  hasPermission: (perm: string) => boolean;
  hasAny: (perms: string[]) => boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('userPermissions');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try { return localStorage.getItem('userIsAdmin') === 'true'; } catch { return false; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Quick diagnostics: dump persisted auth keys and restore tenantId for services
    try {
      console.debug('[AuthProvider] localStorage userPermissions=', localStorage.getItem('userPermissions'));
      console.debug('[AuthProvider] localStorage userIsAdmin=', localStorage.getItem('userIsAdmin'));
      console.debug('[AuthProvider] localStorage tenantId=', localStorage.getItem('tenantId'));
      const t = localStorage.getItem('tenantId');
      if (t) {
        try { setClientServiceTenantId(t); } catch {}
      }
    } catch (e) {}

    checkAuth();
  }, []);

  // Expose debug handle for quick inspection in the browser console
  useEffect(() => {
    try {
      (window as any).__APP_AUTH = {
        user,
        permissions,
        isAdmin,
        loading,
        authToken: localStorage.getItem('authToken'),
        tenantId: localStorage.getItem('tenantId'),
      };
    } catch (e) {}
  }, [user, permissions, isAdmin, loading]);

  // Persist permissions and isAdmin whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('userPermissions', JSON.stringify(permissions || []));
      localStorage.setItem('userIsAdmin', isAdmin ? 'true' : 'false');
    } catch (e) {}
  }, [permissions, isAdmin]);

  // Persist tenantId derived from user when user changes, and restore into clientService
  useEffect(() => {
    try {
      const tenantId = (user && Array.isArray(user.tenants) && user.tenants.length > 0)
        ? (user.tenants[0].tenantId || (user.tenants[0].tenant && user.tenants[0].tenant.id))
        : null;
      if (tenantId) {
        try { localStorage.setItem('tenantId', tenantId); } catch {}
        try { setClientServiceTenantId(tenantId); } catch {}
      }
    } catch (e) {}
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

    // restore cached permissions/tenant quickly to avoid UI flash
    try {
      const cached = localStorage.getItem('userPermissions');
      if (cached) {
        try { setPermissions(JSON.parse(cached)); } catch { setPermissions([]); }
      }
      const cachedAdmin = localStorage.getItem('userIsAdmin');
      if (cachedAdmin) setIsAdmin(cachedAdmin === 'true');
      const cachedTenant = localStorage.getItem('tenantId');
      if (cachedTenant) {
        try { /* nothing else needed here */ } catch {}
      }
    } catch {}

    // Sync token with axios client instance
    try { setAuthToken(token); } catch {}

    try {
      const userData = await AuthService.getProfile();
      setUser(userData);
      // normalize permissions and admin flag
      const { perms, admin } = extractPermissionsFromUser(userData);
      // Only overwrite cached permissions if the backend returned a non-empty set.
      // This protects against responses that do not include tenant-scoped permissions
      // and would otherwise clear permissions that were persisted at login.
      if (Array.isArray(perms) && perms.length > 0) {
        setPermissions(perms);
        // Debug: show extracted permissions for current tenant
        try { console.debug('[AuthContext] extracted permissions for tenant:', perms); } catch (e) {}
        try { localStorage.setItem('userPermissions', JSON.stringify(perms)); } catch {}
      } else {
        try { console.debug('[AuthContext] profile returned no permissions; keeping cached permissions'); } catch (e) {}
      }

      // Only set admin flag to true if backend indicates admin; avoid clearing a cached admin flag
      if (admin) {
        setIsAdmin(admin);
        try { localStorage.setItem('userIsAdmin', admin ? 'true' : 'false'); } catch {}
      }
    } catch (e: any) {
      if (e instanceof ApiError) {
        console.warn("getProfile falló:", e.status, e.message);
        // Solo eliminamos token si estamos seguros que no sirve (401/invalid)
        if (e.status === 401) {
          localStorage.removeItem("authToken");
          setUser(null);
        }
        // 403 suele ser CORS, política o permisos. NO borres token aquí.
      } else {
        console.warn("getProfile error no tipado:", e?.message || e);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      const response = await AuthService.signIn(credentials);
      if (response?.token) {
        localStorage.setItem("authToken", response.token);
        try { setAuthToken(response.token); } catch {}
        let u = response.user || { email: credentials.email };
        // If the returned user is incomplete (no tenants/roles/permissions),
        // try to fetch the full profile now so UI permissions are hydrated
        // immediately after login (avoids needing a manual page refresh).
        const looksIncomplete = !(Array.isArray(u.tenants) && u.tenants.length > 0) && !(u.permissions || u.perms || u.role || u.roles);
        if (looksIncomplete) {
          try {
            const prof = await AuthService.getProfile();
            if (prof) u = prof;
          } catch (e) {
            // ignore - we'll continue with what we have
          }
        }

        // Ensure tenantId is persisted and client services configured BEFORE
        // extracting tenant-scoped permissions (extractPermissionsFromUser
        // reads localStorage.tenantId to pick tenantEntry).
        try {
          const tenantId = (u.tenants && u.tenants[0] && (u.tenants[0].tenantId || (u.tenants[0].tenant && u.tenants[0].tenant.id))) || null;
          if (tenantId) {
            localStorage.setItem('tenantId', tenantId);
            try { setClientServiceTenantId(String(tenantId)); } catch {}
            try { setCategoryTenantId(String(tenantId)); } catch {}
          }
        } catch (e) {}

        setUser(u);
        const { perms, admin } = extractPermissionsFromUser(u);
        setPermissions(perms);
        try { localStorage.setItem('userPermissions', JSON.stringify(perms)); localStorage.setItem('userIsAdmin', admin ? 'true' : 'false'); } catch {}
        // store tenantId quickly if available and configure services immediately
        try {
          const tenantId = (u.tenants && u.tenants[0] && (u.tenants[0].tenantId || (u.tenants[0].tenant && u.tenants[0].tenant.id))) || null;
          if (tenantId) {
            localStorage.setItem('tenantId', tenantId);
            try { setClientServiceTenantId(String(tenantId)); } catch {}
            try { setCategoryTenantId(String(tenantId)); } catch {}
          }
        } catch {}
        try { console.debug('[AuthContext] permissions after signIn:', perms); } catch (e) {}
        setIsAdmin(admin);
        return { success: true };
      }
      throw new Error("No se recibió token de autenticación");
    } catch (err: any) {
      const message = err?.message || "Error al iniciar sesión";
      if (message === "auth.emailNotVerified") {
        return { success: false, error: "Tu correo no está verificado. Te enviamos un correo de verificación.", needVerification: true };
      }
      setError(message);
      return { success: false, error: message };
    }
  };

  const signUp = async (data: SignUpData) => {
    try { setError(null); await AuthService.signUp(data); return { success: true }; }
    catch (err: any) { const m = err.message || "Error al registrarse"; setError(m); return { success: false, error: m }; }
  };

  const signOut = async () => {
    try { await AuthService.signOut(); } catch {} finally {
      localStorage.removeItem("authToken");
      try { localStorage.removeItem('userPermissions'); localStorage.removeItem('userIsAdmin'); localStorage.removeItem('tenantId'); } catch {}
      try { clearAuthToken(); } catch {}
      setUser(null);
    }
  };

  const signInWithToken = async (token: string, userData?: any) => {
    try {
      localStorage.setItem("authToken", token);
      try { setAuthToken(token); } catch {}
      if (userData) {
        let u = userData;
        const looksIncomplete = !(Array.isArray(u.tenants) && u.tenants.length > 0) && !(u.permissions || u.perms || u.role || u.roles);
        if (looksIncomplete) {
          try {
            const prof = await AuthService.getProfile();
            if (prof) u = prof;
          } catch (e) {}
        }

        // Persist tenantId and configure services before extracting permissions
        try {
          const tenantId = (u.tenants && u.tenants[0] && (u.tenants[0].tenantId || (u.tenants[0].tenant && u.tenants[0].tenant.id))) || null;
          if (tenantId) {
            localStorage.setItem('tenantId', tenantId);
            try { setClientServiceTenantId(String(tenantId)); } catch {}
            try { setCategoryTenantId(String(tenantId)); } catch {}
          }
        } catch (e) {}

        setUser(u);
        const { perms, admin } = extractPermissionsFromUser(u);
        if (Array.isArray(perms) && perms.length > 0) {
          setPermissions(perms);
          try { localStorage.setItem('userPermissions', JSON.stringify(perms)); } catch {}
        }
        if (admin) {
          setIsAdmin(admin);
          try { localStorage.setItem('userIsAdmin', admin ? 'true' : 'false'); } catch {}
        }
      } else {
        // intenta hidratar profile desde el backend
        try {
          const u = await AuthService.getProfile();
          setUser(u);
          const { perms, admin } = extractPermissionsFromUser(u);
          if (Array.isArray(perms) && perms.length > 0) {
            setPermissions(perms);
            try { localStorage.setItem('userPermissions', JSON.stringify(perms)); } catch {}
          }
          if (admin) {
            setIsAdmin(admin);
            try { localStorage.setItem('userIsAdmin', admin ? 'true' : 'false'); } catch {}
          }
        } catch (e) {
          // ignore
        }
      }
      return { success: true };
    } catch (err: any) {
      const message = err?.message || "Error al iniciar sesión con token";
      setError(message);
      return { success: false, error: message };
    }
  };

  function matchesByAlias(requested: string): boolean {
    if (!requested) return false;
    // direct match
    if (permissions.includes(requested)) return true;
    // try to match by action suffix and resource substring
    const m = requested.match(/(.*?)(Import|Create|Edit|Destroy|Read|Autocomplete|Export|Restore|Archive)$/i);
    if (m) {
      const resource = m[1];
      const action = m[2];
      const actionNorm = action.charAt(0).toUpperCase() + action.slice(1);
      const found = permissions.find((p) => p.endsWith(actionNorm) && p.toLowerCase().includes(resource.toLowerCase()));
      if (found) return true;
    }
    // try reverse: requested might be full resource like clientAccountEdit while permissions use clientEdit
    const m2 = requested.match(/(.*?)(Import|Create|Edit|Destroy|Read|Autocomplete|Export|Restore|Archive)$/i);
    if (m2) {
      const action = m2[2];
      const actionNorm = action.charAt(0).toUpperCase() + action.slice(1);
      const found = permissions.find((p) => p.endsWith(actionNorm) && p.toLowerCase().includes(requested.toLowerCase()));
      if (found) return true;
    }
    return false;
  }

  const hasPermission = (perm: string) => {
    if (isAdmin) return true;
    if (!permissions || permissions.length === 0) return false;
    const ok = matchesByAlias(perm);
    // Debug: only log client-related permission checks to avoid noisy logs
    try {
      if (perm && perm.toLowerCase().includes('client')) {
        console.debug('[AuthContext] hasPermission check', { perm, isAdmin, permissions, result: ok });
      }
    } catch (e) {}
    return ok;
  };

  const hasAny = (perms: string[]) => {
    if (isAdmin) return true;
    if (!perms || perms.length === 0) return false;
    return perms.some((p) => hasPermission(p));
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut, signInWithToken, isAuthenticated: !!user, hasPermission, hasAny }}>
      {children}
    </AuthContext.Provider>
  );
};

function extractPermissionsFromUser(u: any): { perms: string[]; admin: boolean } {
  if (!u) return { perms: [], admin: false };
  // If user has a tenants array, prefer tenant-scoped permissions for current tenant
  const tenantId = localStorage.getItem('tenantId');
  let tenantEntry: any = null;
  if (Array.isArray(u.tenants) && u.tenants.length > 0) {
    if (tenantId) {
      tenantEntry = u.tenants.find((t: any) => (t.tenantId === tenantId) || (t.tenant && (t.tenant.id === tenantId || t.tenant.tenantId === tenantId)));
    }
    if (!tenantEntry) tenantEntry = u.tenants[0];
  }

  // candidate permission sources
  const p = (tenantEntry && (tenantEntry.permissions ?? tenantEntry.perms)) ?? u.permissions ?? u.perms ?? u.role?.permissions ?? u.roles?.permissions;
  const roles = (tenantEntry && tenantEntry.roles) ?? u.roles ?? u.role ?? [];

  // Normalize roles: allow array of strings or array of objects like { name: 'admin' }
  let roleNames: string[] = [];
  if (Array.isArray(roles)) {
    roleNames = roles.map((r: any) => {
      if (!r) return '';
      if (typeof r === 'string') return r;
      return r.name || r.key || r.slug || r.id || '';
    }).filter(Boolean);
  } else if (typeof roles === 'string') {
    roleNames = [roles];
  }

  const admin = roleNames.includes('admin');

  // Normalize permissions: handle arrays of strings, arrays of objects, or comma-separated strings
  let perms: string[] = [];
  if (!p) perms = [];
  else if (Array.isArray(p)) {
    perms = p.map((item: any) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      // item might be an object like { permission: 'clientAccountRead' } or { name: '...' }
      return item.permission || item.name || item.key || '';
    }).filter(Boolean);
  } else if (typeof p === 'string') {
    try {
      const parsed = JSON.parse(p);
      if (Array.isArray(parsed)) perms = parsed.map((it: any) => (typeof it === 'string' ? it : (it?.permission || it?.name || it?.key || ''))).filter(Boolean);
      else perms = p.split(/\s*,\s*/).filter(Boolean);
    } catch {
      perms = p.split(/\s*,\s*/).filter(Boolean);
    }
  } else if (typeof p === 'object') {
    // e.g. { read: true, write: true } — not typical, but try to extract keys
    perms = Object.keys(p).filter(Boolean);
  }

  return { perms, admin };
}
