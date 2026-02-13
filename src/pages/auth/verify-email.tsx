import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "@/layouts/auth-layout";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    document.title = t('auth.verify_email_title') || 'Verificando correo | Cguard';
    (async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      if (!token) {
        toast.error(t('auth.verify_email_missing_token') || 'Falta el token de verificación');
        navigate('/login', { replace: true });
        return;
      }

      try {
        const base = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
        const url = `${base.replace(/\/+$/, "")}/auth/verify-email?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { method: 'PUT', credentials: 'include' });
        if (res.ok) {
          toast.success(t('auth.verify_email_success') || 'Correo verificado, puedes iniciar sesión');
          navigate('/login', { replace: true });
        } else {
          let err = await res.json().catch(() => ({}));
          const message = err && err.message ? err.message : (t('auth.verify_email_failed') || 'No se pudo verificar el correo');
          toast.error(message);
          navigate('/login', { replace: true });
        }
      } catch (error) {
        toast.error(t('auth.verify_email_failed') || 'No se pudo verificar el correo');
        navigate('/login', { replace: true });
      }
    })();
  }, []);

  return (
    <AuthLayout title={t('auth.verify_email_title') || 'Verificando correo'}>
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        <p className="mt-4 text-slate-600">{t('auth.verify_email_processing') || 'Procesando verificación...'}</p>
      </div>
    </AuthLayout>
  );
}
