import { NavLink, useNavigate } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthForm } from "@/hooks/useAuthForm";
import { toast } from "sonner";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { signIn, signInWithToken } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    email, password, showPassword, isLoading,
    setEmail, setPassword, toggleShowPassword, setIsLoading,
    validateEmail, validatePassword
  } = useAuthForm();

    useEffect(() => {
      document.title = t('auth.login_title') || 'Iniciar Sesión | Cguard';
    }, []);
  
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // use validation helpers from the hook (they show localized toasts)
    if (!validateEmail() || !validatePassword(6)) return;
    setIsLoading(true);
    const result = await signIn({ email, password });
    setIsLoading(false);
    if (result.success) {
      toast.success(t('auth.login_success'));
      navigate("/dashboard");
    } else {
      toast.error(result.error || t('auth.login_failed'));
    }
  };
  
  // Abre una ventana popup hacia el endpoint de OAuth en el backend
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
      toast.error(t('auth.could_not_open_auth_window'));
      return;
    }

    const listener = async (e: MessageEvent) => {
      if (!e.data || e.data.type !== "oauth_callback") return;
      const { token, user, error } = e.data;
      window.removeEventListener("message", listener);
      try { popup.close(); } catch {}
      if (error) {
        toast.error(error);
        return;
      }
      const res = await signInWithToken(token, user);
      if (res.success) {
        toast.success(t('auth.login_success'));
        navigate("/dashboard");
      } else {
        toast.error(res.error || t('auth.login_failed'));
      }
    };

    window.addEventListener("message", listener);
  };

  return (
    <AuthLayout 
      title={t('auth.login_prompt') || 'Inicia sesión en tu cuenta'}
    >
      {/* Botones de Inicio de Sesión Social */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
            <path fill="#34A853" d="M16.04 18.013A7.077 7.077 0 0 1 12 19.091c-3.134 0-5.781-2.014-6.723-4.823L1.237 17.35C3.193 21.294 7.265 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
            <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
            <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin("microsoft")}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
            <path d="M0 0h11v11H0z" fill="#f25022"/>
            <path d="M12 0h11v11H12z" fill="#00a4ef"/>
            <path d="M0 12h11v11H0z" fill="#ffb900"/>
            <path d="M12 12h11v11H12z" fill="#7fba00"/>
          </svg>
          Microsoft
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white/80 px-4 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">o</span>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('auth.email_label')}<span style={{ color: "#F75638" }}>*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder={t('auth.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('auth.password_label')}<span style={{ color: "#F75638" }}>*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('auth.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-12 text-slate-900 placeholder-slate-400 transition-all focus:border-[#0C2459] focus:outline-none focus:ring-2 focus:ring-[#0C2459]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white dark:focus:border-[#F75638] dark:focus:ring-[#F75638]/20"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="text-right">
          <NavLink to="/forgot-password" className="text-sm font-medium hover:underline" style={{ color: "#F75638" }}>
            {t('auth.forgot_password')}
          </NavLink>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg py-3 font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0C2459 0%, #1a3a7d 100%)" }}
        >
          {isLoading ? t('auth.signing_in') : t('auth.login')}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-4 text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">o</span>
          </div>
        </div>

        <div className="text-center">
          <span className="text-sm text-slate-600 dark:text-slate-400">{t('auth.no_account_text')} </span>
          <NavLink to="/register" className="text-sm font-semibold hover:underline" style={{ color: "#F75638" }}>
            {t('auth.create_account')}
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}