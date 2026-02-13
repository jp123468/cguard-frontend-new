import { useEffect, useState } from "react";
import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { toast } from "sonner";
import { AuthService } from "@/services/auth/authService";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("t") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (password.length < 8) {
      toast.error(t('auth.password_min_length', { defaultValue: 'Password must be at least 8 characters' }));
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
      navigate("/login");
    } catch (err: any) {
      console.error("Error restableciendo contraseña:", err);
      const msg = err?.message || t('auth.reset_failed', { defaultValue: 'Unable to reset password' });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.reset_title_short', { defaultValue: 'Reset password' })}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
            {t('auth.new_password_label', { defaultValue: 'New password' })}<span>*</span>
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.new_password_placeholder', { defaultValue: 'New password' })}
              className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? t('auth.hide_password', { defaultValue: 'Hide password' }) : t('auth.show_password', { defaultValue: 'Show password' })}
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 inset-y-0 flex items-center justify-center px-2 text-slate-500 hover:text-slate-700"
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
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
            {t('auth.confirm_password_label', { defaultValue: 'Confirm password' })}<span>*</span>
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('auth.confirm_password_placeholder', { defaultValue: 'Confirm password' })}
              className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showConfirm ? t('auth.hide_password', { defaultValue: 'Ocultar contraseña' }) : t('auth.show_password', { defaultValue: 'Mostrar contraseña' })}
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 inset-y-0 flex items-center justify-center px-2 text-slate-500 hover:text-slate-700"
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
          className="w-full rounded-lg py-3 font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #0C2459 0%, #1a3a7d 100%)" }}
        >
          {loading ? t('auth.resetting', { defaultValue: 'Resetting...' }) : t('auth.reset_password', { defaultValue: 'Reset password' })}
        </button>

        <div className="flex items-center justify-between text-sm">
          <NavLink to="/login" className="font-medium hover:underline" style={{ color: "#F75638" }}>
            {t('auth.back_to_login', { defaultValue: 'Back to login' })}
          </NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}
