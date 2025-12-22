import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Register() {
  const { signUp, signInWithToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    document.title = "Registro | Cguard";
  }, []);

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();


    if (!name || !email || !password || !confirm) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");

      return;
    }

    setIsLoading(true);
    const res = await signUp({ email, password, name });
    setIsLoading(false);

    if (res?.success) {
      toast.success("Cuenta creada. Verifica tu correo para poder iniciar sesión.");
      navigate("/login");
    } else {
      const msg = res?.error || "Error al registrarse";
      toast.error(msg);
    }
  };
  const handleSocialLogin = (provider: "google" | "microsoft") => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    // Nota: el backend debe exponer /auth/oauth/:provider que hace el flujo OAuth
    // y luego ejecuta window.opener.postMessage({ type: 'oauth_callback', token, user }, window.opener.location.origin)
    const base = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
    const url = `${base.replace(/\/+$/, "")}/auth/oauth/${provider}`;
    const popup = window.open(url, "oauth_popup", `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
      toast.error("No se pudo abrir la ventana de autenticación.");
      return;
    }

    const listener = async (e: MessageEvent) => {
      if (!e.data || e.data.type !== "oauth_callback") return;
      const { token, user, error } = e.data;
      window.removeEventListener("message", listener);
      try { popup.close(); } catch { }
      if (error) {
        toast.error(error);
        return;
      }
      const res = await signInWithToken(token, user);
      if (res.success) {
        toast.success("Sesión iniciada con éxito");
        navigate("/dashboard");
      } else {
        toast.error(res.error || "Fallo en el inicio de sesión");
      }
    };

    window.addEventListener("message", listener);
  };
  return (
    <AuthLayout
      title="Crea tu cuenta"
    >
   
      {/* Botones Sociales */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z" />
            <path fill="#34A853" d="M16.04 18.013A7.077 7.077 0 0 1 12 19.091c-3.134 0-5.781-2.014-6.723-4.823L1.237 17.35C3.193 21.294 7.265 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z" />
            <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z" />
            <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z" />
          </svg>
          Google
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin("microsoft")}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
            <path d="M0 0h11v11H0z" fill="#f25022" />
            <path d="M12 0h11v11H12z" fill="#00a4ef" />
            <path d="M0 12h11v11H0z" fill="#ffb900" />
            <path d="M12 12h11v11H12z" fill="#7fba00" />
          </svg>
          Microsoft
        </button>
      </div>

      {/* Separador */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white/80 px-4 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">o</span>
        </div>
      </div>

      {/* Formulario */}
      <form className="space-y-4" onSubmit={handleRegister}>
        {/* Nombre */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre<span style={{ color: "#F75638" }}>*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border:white/10 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="name"
            />
          </div>
        </div>
        {/* Email */}
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
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border:white/10 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Contraseña<span style={{ color: "#F75638" }}>*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-12 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirmar Contraseña<span style={{ color: "#F75638" }}>*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-12 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>



        {/* Botón de Enviar */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg py-3 font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0C2459 0%, #1a3a7d 100%)" }}
        >
          {isLoading ? "Creando cuenta..." : "CREAR CUENTA"}
        </button>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-4 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">o</span>
          </div>
        </div>

        {/* Enlace para Iniciar Sesión */}
        <div className="text-center">
          <span className="text-sm text-slate-600 dark:text-slate-400">¿Ya tienes una cuenta? </span>
          <NavLink to="/login" className="text-sm font-semibold hover:underline" style={{ color: "#F75638" }}>
            Inicia sesión
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}