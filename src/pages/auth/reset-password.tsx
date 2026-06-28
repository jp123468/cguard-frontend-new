import { useEffect, useState } from "react";
import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, Smartphone } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { FadeIn } from "@/components/kit";
import { toast } from "sonner";
import { AuthService } from "@/services/auth/authService";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("t") || "";
  // Field users (guards/supervisors) reach this page from the worker-app reset
  // email. Show them the guard-app variant, not the tenant marketing/admin login.
  const isField =
    searchParams.get("audience") === "field" || searchParams.get("app") === "worker";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doneField, setDoneField] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t('auth.reset_title', { defaultValue: 'Reset password | Cguard' });
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) {
      toast.error(t('auth.token_missing', { defaultValue: 'Reset token not found in URL.' }));
      return;
    }
    // Validación de política de contraseña
    const { isStrongPassword, PASSWORD_POLICY_TEXT } = await import('@/lib/passwordPolicy');
    if (!isStrongPassword(password)) {
      const msg = t('auth.weakPassword', { defaultValue: `La contraseña es muy débil. Requisitos: ${PASSWORD_POLICY_TEXT}` })
      toast.error(msg);
      return;
    }
    if (password !== confirm) {
      toast.error(t('auth.passwords_mismatch', { defaultValue: 'Passwords do not match' }));
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword(token, password);
      toast.success(t('auth.reset_success', { defaultValue: 'Password reset successfully. Please log in.' }));
      // Field users sign in from the native app, not the web admin login.
      if (isField) {
        setDoneField(true);
        return;
      }
      navigate("/login");
    } catch (err: any) {
      console.error("Error restableciendo contraseña:", err);
      const msg = err?.message || t('auth.reset_failed', { defaultValue: 'Unable to reset password' });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (doneField) {
    return (
      <AuthLayout
        variant="field"
        title={t('auth.reset_done_title', { defaultValue: '¡Contraseña actualizada!' })}
        subtitle={t('auth.reset_done_field_subtitle', { defaultValue: 'Vuelve a la app C-Guard Pro e inicia sesión con tu nueva contraseña.' })}
      >
        <FadeIn className="flex flex-col items-center text-center gap-5 py-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(34,197,94,0.12)" }}>
            <CheckCircle2 className="h-9 w-9" style={{ color: "#16a34a" }} />
          </div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-xs">
            {t('auth.reset_done_field_body', { defaultValue: 'Tu contraseña fue restablecida. Abre la app C-Guard Pro en tu teléfono e inicia sesión con tu correo y tu nueva contraseña.' })}
          </p>
          <a
            href="cguardpro://login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0C2459 0%, #1a3a7d 100%)" }}
          >
            <Smartphone className="h-5 w-5" />
            {t('auth.reset_open_app', { defaultValue: 'Abrir la app C-Guard Pro' })}
          </a>
        </FadeIn>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant={isField ? 'field' : 'admin'} title={t('auth.reset_title_short', { defaultValue: 'Reset password' })}>
      <FadeIn>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-foreground">
            {t('auth.new_password_label', { defaultValue: 'New password' })}<span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.new_password_placeholder', { defaultValue: 'New password' })}
              className="w-full h-12 rounded-xl border border-slate-200 bg-card px-4 pr-10 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? t('auth.hide_password', { defaultValue: 'Hide password' }) : t('auth.show_password', { defaultValue: 'Show password' })}
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 inset-y-0 flex items-center justify-center px-2 text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-6 w-6" />
              ) : (
                <Eye className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-foreground">
            {t('auth.confirm_password_label', { defaultValue: 'Confirm password' })}<span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('auth.confirm_password_placeholder', { defaultValue: 'Confirm password' })}
              className="w-full h-12 rounded-xl border border-slate-200 bg-card px-4 pr-10 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-800/50 dark:text-white"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showConfirm ? t('auth.hide_password', { defaultValue: 'Ocultar contraseña' }) : t('auth.show_password', { defaultValue: 'Mostrar contraseña' })}
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 inset-y-0 flex items-center justify-center px-2 text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              {showConfirm ? (
                <EyeOff className="h-6 w-6" />
              ) : (
                <Eye className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="cg-gradient-brand w-full rounded-lg py-3 font-semibold text-primary-foreground transition-all hover:shadow-lg hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t('auth.resetting', { defaultValue: 'Resetting...' }) : t('auth.reset_password', { defaultValue: 'Reset password' })}
        </button>

        {!isField && (
          <div className="flex items-center justify-between text-sm">
            <NavLink to="/login" className="font-medium text-primary hover:underline">
              {t('auth.back_to_login', { defaultValue: 'Back to login' })}
            </NavLink>
          </div>
        )}
      </form>
      </FadeIn>
    </AuthLayout>
  );
}
