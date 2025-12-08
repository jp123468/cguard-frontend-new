import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthService, LoginCredentials, SignUpData } from "../services/auth/authService";
import { ApiError } from "../services/api/apiService";

interface User { id?: string; email: string; [k: string]: any }
interface AuthResult { success: boolean; error?: string; needVerification?: boolean }
interface AuthContextType {
  user: User | null; loading: boolean; error: string | null;
  signIn: (c: LoginCredentials) => Promise<AuthResult>;
  signUp: (d: SignUpData) => Promise<AuthResult>;
  signOut: () => Promise<void>; isAuthenticated: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

    try {
      const userData = await AuthService.getProfile();
      setUser(userData);
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
        setUser(response.user || { email: credentials.email });
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
      localStorage.removeItem("authToken"); setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
