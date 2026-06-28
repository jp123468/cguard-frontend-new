import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";

// Mi Seguridad (client app) store links — configurable via env so they can be
// updated without a code change. Fallback to a store search until set.
const MISEGURIDAD_PLAY_URL = (import.meta as any).env?.VITE_MISEGURIDAD_PLAY_URL || "https://play.google.com/store/search?q=Mi%20Seguridad%20CGuardPro&c=apps";
const MISEGURIDAD_IOS_URL = (import.meta as any).env?.VITE_MISEGURIDAD_IOS_URL || "https://apps.apple.com/search?term=Mi%20Seguridad%20CGuardPro";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/kit";
import { ApiService } from "@/services/api/apiService";
import { AuthService } from '@/services/auth/authService';

export default function ClientRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const rawInviteToken = searchParams.get("token") || searchParams.get("invitationToken") || searchParams.get("invite") || undefined;
  const inviteToken = rawInviteToken && rawInviteToken !== 'null' && rawInviteToken !== 'undefined' ? rawInviteToken : undefined;
  const inviteType = searchParams.get("inviteType") || undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lockedName, setLockedName] = useState(false);
  const [lockedEmail, setLockedEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState<any>(null);
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const shownToastRef = useRef<string | null>(null);

  const errorClass = (field: string) => (errors[field] ? "border-red-600 ring-1 ring-red-600" : "");
  const formControl = "h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground placeholder-slate-400";
  const labelClass = "mb-2 block text-sm font-medium text-foreground min-h-[3rem] leading-5";

  useEffect(() => {
    const fetchInvite = async () => {
      // Si hay un token de invitación, limpiar cualquier sesión activa para evitar conflictos
      if (inviteToken) {
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          console.log('[client-registration] cleared any active session for invitation flow');
        } catch (e) {
          console.warn('[client-registration] could not clear session:', e);
        }
      }
      
      if (!inviteToken) return;
      if (inviteType === 'guard') {
        navigate(`/auth/invitation?token=${encodeURIComponent(inviteToken)}&inviteType=guard`);
        return;
      }
      // Internal administrative staff (admins, supervisors, …) belong in the CRM
      // panel, NOT the customer registration view — redirect older links there.
      if (inviteType === 'staff' || inviteType === 'admin') {
        navigate(`/auth/accept-invitation?token=${encodeURIComponent(inviteToken)}&inviteType=staff`, { replace: true });
        return;
      }
      // inviteType puede ser 'client' (clientes)
      setIsLoading(true);
      try {
        const endpointBase = `/user/public`;
        const qp = new URLSearchParams();
        qp.append("token", inviteToken);
        const urlWithQs = `${endpointBase}?${qp.toString()}`;
        const res = await ApiService.get(urlWithQs, { skipAuth: true });
        const data = res?.data || res;
        if (!data) {
          setInviteNotFound(true);
          return;
        }
        setFetched(data);
        const rootName = data.fullName || data.name || (data.firstName ? `${data.firstName} ${data.lastName || ''}` : undefined);
        const emailCandidate = data.email || undefined;
        if (rootName) { setName(rootName); setLockedName(true); }
        if (emailCandidate) { setEmail(emailCandidate); setLockedEmail(true); }
      } catch (err: any) {
        // If this token belongs to a guard invitation instead of a client invitation,
        // redirect to the guard invitation page.
        if (inviteToken) {
          try {
            const guardResponse = await ApiService.get(`/security-guard/public?token=${encodeURIComponent(inviteToken)}`, { skipAuth: true });
            const guardData = guardResponse?.data || guardResponse;
            if (guardData) {
              // This is a security guard invitation
              navigate(`/auth/invitation?token=${encodeURIComponent(inviteToken)}&inviteType=guard`);
              return;
            }
          } catch (_guardErr) {
            // Both endpoints failed - show error
            console.error('[client-registration] Both endpoints failed:', { err, _guardErr });
          }
        }
        setInviteNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvite();
  }, [inviteToken, navigate]);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!name?.trim()) nextErrors.name = "El nombre es obligatorio";
    if (!email?.trim()) nextErrors.email = "El correo electrónico es obligatorio";
    else if (!validateEmail(email)) nextErrors.email = "Correo electrónico inválido";
    if (!password) nextErrors.password = "La contraseña es obligatoria";
    else {
      if (password.length < 8) nextErrors.password = "La contraseña debe tener al menos 8 caracteres";
      else if (!/[A-Z]/.test(password)) nextErrors.password = "La contraseña debe contener al menos una letra mayúscula";
      else if (!/[a-z]/.test(password)) nextErrors.password = "La contraseña debe contener al menos una letra minúscula";
      else if (!/[0-9]/.test(password)) nextErrors.password = "La contraseña debe contener al menos un número";
      else if (!/[^A-Za-z0-9]/.test(password)) nextErrors.password = "La contraseña debe contener al menos un carácter especial";
    }
    if (!confirm) nextErrors.confirm = "Confirme la contraseña";
    if (password && confirm && password !== confirm) nextErrors.confirm = "Las contraseñas no coinciden";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload: any = {
        email,
        password,
        invitationToken: inviteToken,
        name,
      };
      await AuthService.signUp(payload);
      // A client is NOT a tenant web-admin — do NOT send them to /login (it fails
      // for them). Show a confirmation with the Mi Seguridad app + download links.
      toast.success("¡Cuenta activada!");
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    } catch (err: any) {
      toast.error(err?.message || "Error al registrar");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine el título basado en el tipo de invitación o los roles
  const getTitle = () => {
    // Si tenemos datos de la invitación, usar los roles para determinar el título
    if (fetched && fetched.roles && Array.isArray(fetched.roles)) {
      const roles = fetched.roles;
      if (roles.includes('supervisor') || roles.includes('securitySupervisor')) {
        return t('supervisor.registration_title', { defaultValue: 'Registro de Supervisor' });
      }
      if (roles.includes('customer')) {
        return t('customer.registration_title', { defaultValue: 'Registro de Cliente' });
      }
      if (roles.includes('admin')) {
        return t('admin.registration_title', { defaultValue: 'Registro de Administrador' });
      }
    }
    
    // Fallback a inviteType
    if (inviteType === 'staff') {
      return t('staff.registration_title', { defaultValue: 'Registro de usuario' });
    }
    return t('client.registration_title', { defaultValue: 'Registro de cliente' });
  };

  // Función para obtener el texto descriptivo del rol
  const getRoleDescription = () => {
    if (fetched && fetched.roles && Array.isArray(fetched.roles)) {
      const roles = fetched.roles;
      if (roles.includes('supervisor') || roles.includes('securitySupervisor')) {
        return 'Estás completando tu registro como Supervisor. Por favor, ingresa una contraseña para tu cuenta.';
      }
      if (roles.includes('customer')) {
        return 'Estás completando tu registro como Cliente. Por favor, ingresa una contraseña para tu cuenta.';
      }
      if (roles.includes('admin')) {
        return 'Estás completando tu registro como Administrador. Por favor, ingresa una contraseña para tu cuenta.';
      }
    }
    return 'Por favor, completa tu registro ingresando una contraseña para tu cuenta.';
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950">
      {/* Left panel — tenant branding */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0F1923 0%, #1C2B3A 50%, #0F1923 100%)" }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#C8860A 1px, transparent 1px), linear-gradient(90deg, #C8860A 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#F5C300] opacity-5 blur-3xl pointer-events-none" />

        {/* Tenant logo or name */}
        <div className="relative z-10">
          {fetched?.tenant?.logoUrl ? (
            <img
              src={fetched.tenant.logoUrl}
              alt={fetched?.tenant?.name || 'Logo'}
              className="h-16 object-contain"
            />
          ) : fetched?.tenant?.name ? (
            <div className="flex items-center gap-3">
              <Building2 className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold text-white">{fetched.tenant.name}</span>
            </div>
          ) : (
            <div className="h-16" />
          )}
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] text-white mb-6">
            {fetched?.tenant?.name ? (
              <>
                Bienvenido a{" "}
                <span
                  className="block"
                  style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text", backgroundImage: "linear-gradient(90deg, #C8860A, #F5C300)" }}
                >
                  {fetched.tenant.name}
                </span>
              </>
            ) : (
              "Completar registro"
            )}
          </h1>
          <p className="text-base xl:text-lg text-slate-400 leading-relaxed max-w-md">
            {getRoleDescription()}
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-500">{fetched?.tenant?.name || ''}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile tenant branding */}
        <div className="mb-8 lg:hidden text-center">
          {fetched?.tenant?.logoUrl ? (
            <img src={fetched.tenant.logoUrl} alt={fetched?.tenant?.name || 'Logo'} className="h-12 object-contain mx-auto" />
          ) : fetched?.tenant?.name ? (
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">{fetched.tenant.name}</span>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-md">
          {/* Card header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-1">
              {done ? '¡Cuenta activada!' : getTitle()}
            </h2>
            {done && <p className="text-sm text-muted-foreground">Tu acceso quedó listo.</p>}
          </div>

          {/* Finish: Mi Seguridad app + download links (clients don't use the web login) */}
          {done ? (
            <FadeIn className="rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-200 dark:border-white/5 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/12">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tu cuenta con <strong className="text-foreground">{fetched?.tenant?.name || 'tu proveedor de seguridad'}</strong> está lista.
                Descarga <strong className="text-foreground">Mi Seguridad</strong> para monitorear y gestionar tu servicio de seguridad desde tu teléfono.
              </p>

              {/* App card */}
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 p-4 text-left">
                <img src="/assets/logo/miseguridad.png" alt="Mi Seguridad" className="h-12 w-12 rounded-xl object-contain shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Mi Seguridad</p>
                  <p className="text-xs text-muted-foreground">Vigilantes y puestos en tiempo real, rondas con GPS, incidentes y reportes.</p>
                </div>
              </div>

              {/* Download buttons */}
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <a href={MISEGURIDAD_PLAY_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-[#0A0E16] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  <span style={{ fontSize: 18, lineHeight: 1 }}>▶</span> Google Play
                </a>
                <a href={MISEGURIDAD_IOS_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-[#0A0E16] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  <span style={{ fontSize: 18, lineHeight: 1 }}></span> App Store
                </a>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">Inicia sesión en la app con el correo y la contraseña que acabas de crear.</p>
            </FadeIn>
          ) : (
          <FadeIn className="rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-200 dark:border-white/5">
            <form className="space-y-3" onSubmit={handleSubmit}>
              {inviteNotFound && (
                <div className="rounded-md border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-300">
                  {t('client.invite_not_found', { defaultValue: 'Invitación no encontrada o inválida.' })}
                </div>
              )}
              {fetched && !inviteNotFound && (
                <div className="rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300 mb-4">
                  {getRoleDescription()}
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre<span style={{ color: "#F75638" }}>*</span></label>
                  <Input className={`${formControl} ${errorClass('name')}`} value={name} onChange={e => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }} placeholder="Nombre" disabled={isLoading || lockedName} />
                  {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
                </div>
                <div>
                  <label className={labelClass}>Email<span style={{ color: "#F75638" }}>*</span></label>
                  <Input className={`${formControl} ${errorClass('email')}`} value={email} onChange={e => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="Email" disabled={isLoading || lockedEmail} />
                  {errors.email && <div className="text-red-600 text-sm mt-1">{errors.email}</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Contraseña<span style={{ color: "#F75638" }}>*</span></label>
                  <div className="relative">
                    <Input className={`${formControl} ${errorClass('password')}`} type={showPwd ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }} placeholder="Contraseña" disabled={isLoading} />
                    <button type="button" className="absolute right-2 top-2 text-slate-500 dark:text-slate-400" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {errors.password && <div className="text-red-600 text-sm mt-1">{errors.password}</div>}
                </div>
                <div>
                  <label className={labelClass}>Confirmar contraseña<span style={{ color: "#F75638" }}>*</span></label>
                  <div className="relative">
                    <Input className={`${formControl} ${errorClass('confirm')}`} type={showConfirm ? "text" : "password"} value={confirm} onChange={e => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }} placeholder="Confirmar contraseña" disabled={isLoading} />
                    <button type="button" className="absolute right-2 top-2 text-slate-500 dark:text-slate-400" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {errors.confirm && <div className="text-red-600 text-sm mt-1">{errors.confirm}</div>}
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button type="submit" variant="brand" size="lg" className="px-8" disabled={isLoading}>{isLoading ? t('client.registering', { defaultValue: 'Registrando...' }) : t('client.register', { defaultValue: 'Registrar' })}</Button>
              </div>
            </form>
          </FadeIn>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {fetched?.tenant?.name ? `© ${new Date().getFullYear()} ${fetched.tenant.name}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
