import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState<any>(null);
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const shownToastRef = useRef<string | null>(null);

  const errorClass = (field: string) => (errors[field] ? "border-red-600 ring-1 ring-red-600" : "");
  const formControl = "h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-slate-900 placeholder-slate-400";
  const labelClass = "mb-2 block text-sm font-medium text-slate-700 min-h-[3rem] leading-5";

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
      // inviteType puede ser 'client' o 'staff' (supervisores, admins, etc.)
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
      toast.success("Registro completado, ya puedes iniciar sesión");
      navigate("/login");
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
    <AuthLayout title={getTitle()}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        {inviteNotFound && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            {t('client.invite_not_found', { defaultValue: 'Invitación no encontrada o inválida.' })}
          </div>
        )}
        {fetched && !inviteNotFound && (
          <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800 mb-4">
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
              <button type="button" className="absolute right-2 top-2" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errors.password && <div className="text-red-600 text-sm mt-1">{errors.password}</div>}
          </div>
          <div>
            <label className={labelClass}>Confirmar contraseña<span style={{ color: "#F75638" }}>*</span></label>
            <div className="relative">
              <Input className={`${formControl} ${errorClass('confirm')}`} type={showConfirm ? "text" : "password"} value={confirm} onChange={e => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }} placeholder="Confirmar contraseña" disabled={isLoading} />
              <button type="button" className="absolute right-2 top-2" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {errors.confirm && <div className="text-red-600 text-sm mt-1">{errors.confirm}</div>}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button type="submit" className="bg-[#C8860A] hover:bg-[#B37809] text-white px-8 py-2 rounded" disabled={isLoading}>{isLoading ? t('client.registering', { defaultValue: 'Registrando...' }) : t('client.register', { defaultValue: 'Registrar' })}</button>
        </div>
      </form>
    </AuthLayout>
  );
}
