import { useEffect, useState } from "react";
import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { toast } from "sonner";
import { AuthService } from "@/services/auth/authService";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("t") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Restablecer contraseña | Cguard";
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) {
      toast.error("Token de restablecimiento no encontrado en la URL.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword(token, password);
      toast.success("Contraseña restablecida correctamente. Inicia sesión.");
      navigate("/login");
    } catch (err: any) {
      console.error("Error restableciendo contraseña:", err);
      const msg = err?.message || "No se puede restablecer la contraseña";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Restablecer contraseña">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
            Nueva contraseña*
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-0 bottom-0 h-12 flex items-center justify-center px-2 text-slate-500 hover:text-slate-700"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-6 w-6 translate-y-1" />
              ) : (
                <Eye className="h-6 w-6 translate-y-1" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
            Confirmar contraseña*
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-0 bottom-0 h-12 flex items-center justify-center px-2 text-slate-500 hover:text-slate-700"
              disabled={loading}
            >
              {showConfirm ? (
                <EyeOff className="h-6 w-6 translate-y-1" />
              ) : (
                <Eye className="h-6 w-6 translate-y-1" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #0C2459 0%, #1a3a7d 100%)" }}
        >
          {loading ? "Restableciendo..." : "Restablecer contraseña"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <NavLink to="/login" className="font-medium hover:underline" style={{ color: "#F75638" }}>
            Volver a iniciar sesión
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}
