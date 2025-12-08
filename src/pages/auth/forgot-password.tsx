import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { toast } from "sonner";
import { AuthService } from "@/services/auth/authService";
import { NavLink } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "Olvidé mi contraseña | Cguard";
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");

    const value = email.trim();
    if (!value) {
      setFormError("Por favor ingresa tu correo electrónico");
      return;
    }

    setIsLoading(true);
    try {
      // NOTE: Assuming AuthService.sendPasswordResetEmail is correctly implemented
      await AuthService.sendPasswordResetEmail(value); 
      toast.success("Enlace enviado correctamente. Revisa tu correo electrónico.");
      setEmail("");
    } catch (err: any) {
      console.error("Error al enviar enlace:", err);
      // The original Spanish error message was good, re-using it.
      const msg = "No se pudo enviar el enlace. Verifica tu correo."; 
      setFormError(msg);
      toast.error("No se pudo enviar el enlace. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Correo Electrónico<span style={{ color: "#F75638" }}>*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="email"
            />
          </div>
        </div>

        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg py-3 font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0C2459 0%, #1a3a7d 100%)" }}
        >
          {isLoading ? "Enviando enlace..." : "ENVIAR ENLACE DE RESTABLECIMIENTO"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-4 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              o
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <NavLink to="/login" className="font-medium hover:underline" style={{ color: "#F75638" }}>
            Volver a iniciar sesión
          </NavLink>
          <NavLink to="/register" className="text-slate-600 hover:underline dark:text-slate-400">
            Crear una cuenta
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}
