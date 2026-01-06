import React, { useEffect, useState, useRef } from "react";
import { NavLink, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/layouts/auth-layout";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ApiService } from "@/services/api/apiService";
import securityGuardService from "@/lib/api/securityGuardService";

export default function GuardRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("token") || searchParams.get("invite") || undefined;
  const securityGuardId = searchParams.get("securityGuardId") || undefined;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [lockedFirstName, setLockedFirstName] = useState(false);
  const [lockedLastName, setLockedLastName] = useState(false);
  const [governmentId, setGovernmentId] = useState("");
  const [hiringContractDate, setHiringContractDate] = useState("");
  const [gender, setGender] = useState("");
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [bloodType, setBloodType] = useState("");
  const [guardCredentials, setGuardCredentials] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [academicInstruction, setAcademicInstruction] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lockedEmail, setLockedEmail] = useState(false);
  const [lockedPhone, setLockedPhone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState<any>(null);
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const shownToastRef = useRef<string | null>(null);

  const errorClass = (field: string) => (errors[field] ? "border-red-600 ring-1 ring-red-600" : "");

  const formControl = "h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm text-slate-900 placeholder-slate-400";
  const labelClass = "mb-2 block text-sm font-medium text-slate-700 min-h-[3rem] leading-5";

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  useEffect(() => { 
    const fetchInvite = async () => {
      console.log('[registration] params ->', { inviteToken, securityGuardId });
      if (!inviteToken && !securityGuardId) return;
      setIsLoading(true);
      try {
        const endpointBase = `/security-guard/public`;
        const qp = new URLSearchParams();
        if (inviteToken) qp.append("token", inviteToken);
        if (securityGuardId) qp.append("securityGuardId", securityGuardId);
        const urlWithQs = qp.toString() ? `${endpointBase}?${qp.toString()}` : endpointBase;
        const res = await ApiService.get(urlWithQs);
        const data = res?.data || res;
        console.log('[registration] invite response ->', data);
        if (!data) {
          setInviteNotFound(true);
          return;
        }

        setFetched(data);

        // nombres / email
        const rootFirst = data.firstName || data.guard?.firstName || (data.fullName ? String(data.fullName).split(" ")[0] : undefined);
        const rootLast = data.lastName || data.guard?.lastName || (data.fullName ? String(data.fullName).split(" ").slice(1).join(" ") : undefined);
        const emailCandidate = data.email || data.guard?.email || undefined;
        const phoneCandidate = data.guard?.phoneNumber || data.phoneNumber || data.phone || data.mobile || undefined;
        // Log which fields we will prefill
        console.log('[registration] prefill candidates ->', { rootFirst, rootLast, emailCandidate, phoneCandidate });
        if (rootFirst) { setFirstName(rootFirst); setLockedFirstName(true); }
        if (rootLast) { setLastName(rootLast); setLockedLastName(true); }
        if (emailCandidate) { setEmail(emailCandidate); setLockedEmail(true); }
        if (phoneCandidate) { setPhone(phoneCandidate); setLockedPhone(true); }

        // Per request: leave all other fields empty (do not prefill)
        // Only `firstName`, `lastName` and `email` are prefilled and locked when present.

      } catch (err: any) {
        const msgCandidates = [
          typeof err?.message === "string" ? err.message : undefined,
          err?.data?.message,
          err?.data?.error,
          err?.message && String(err.message),
        ].filter(Boolean) as string[];
        let rawMsg = msgCandidates.join(" ") || "";

        // Normalize repeated sentences: keep first occurrence of consecutive duplicates
        const parts = rawMsg.split(/([.?!])\s*/).filter(Boolean);
        const sentences: string[] = [];
        for (let i = 0; i < parts.length; i += 2) {
          const sentence = (parts[i] || "").trim();
          const punct = parts[i + 1] || ".";
          const full = (sentence + punct).trim();
          if (!full) continue;
          if (sentences.length === 0 || sentences[sentences.length - 1] !== full) sentences.push(full);
        }
        let msg = sentences.join(" ");

        // Truncate if too long
        const MAX = 140;
        if (msg.length > MAX) msg = msg.slice(0, MAX - 3).trim() + "...";

        // If message indicates already-created user, show it once and redirect
        const lower = msg.toLowerCase();
        if (lower.includes("ya fue creado") || lower.includes("ya fue creado y no puede")) {
          if (shownToastRef.current !== msg) {
            shownToastRef.current = msg;
            toast.error(msg || "La cuenta ya fue creada — serás redirigido al inicio de sesión.");
            // clear ref after short delay to allow future toasts
            setTimeout(() => (shownToastRef.current = null), 3000);
          }
          navigate("/login");
          return;
        }

        setInviteNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [inviteToken, securityGuardId]);

  const validateStep = (s: number) => {
    const collect = (stepNum: number) : Record<string,string> => {
      const nextErrors: Record<string, string> = {};
      if (stepNum === 1) {
        if (!firstName?.trim()) nextErrors.firstName = "El nombre es obligatorio";
        if (!lastName?.trim()) nextErrors.lastName = "El apellido es obligatorio";
        if (!email?.trim()) nextErrors.email = "El correo electrónico es obligatorio";
        else if (!validateEmail(email)) nextErrors.email = "Correo electrónico inválido";
      }
      if (stepNum === 2) {
        if (!governmentId?.trim()) nextErrors.governmentId = "El documento de identidad es obligatorio";
        if (!birthDate) nextErrors.birthDate = "La fecha de nacimiento es obligatoria";
        if (!birthPlace?.trim()) nextErrors.birthPlace = "El lugar de nacimiento es obligatorio";
        if (!gender) nextErrors.gender = "El género es obligatorio";
        if (!maritalStatus) nextErrors.maritalStatus = "El estado civil es obligatorio";
        if (!academicInstruction) nextErrors.academicInstruction = "La formación académica es obligatoria";
      }
      if (stepNum === 3) {
        if (!hiringContractDate) nextErrors.hiringContractDate = "La fecha de contratación es obligatoria";
        if (!bloodType) nextErrors.bloodType = "El grupo sanguíneo es obligatorio";
        if (!guardCredentials?.trim()) nextErrors.guardCredentials = "Las credenciales son obligatorias";
        if (!address?.trim()) nextErrors.address = "La dirección es obligatoria";
        if (!phone?.trim()) nextErrors.phone = "El teléfono es obligatorio";
        if (!password) nextErrors.password = "La contraseña es obligatoria";
        if (!confirm) nextErrors.confirm = "Confirme la contraseña";
        if (password && confirm && password !== confirm) nextErrors.confirm = "Las contraseñas no coinciden";
      }
      return nextErrors;
    };

    const nextErrors = collect(s);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s: number) => Math.min(totalSteps, s + 1));
  };

  const handlePrev = () => {
    setStep((s: number) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all steps and show combined errors
    const collect = (stepNum: number) : Record<string,string> => {
      const nextErrors: Record<string, string> = {};
      if (stepNum === 1) {
        if (!firstName?.trim()) nextErrors.firstName = "El nombre es obligatorio";
        if (!lastName?.trim()) nextErrors.lastName = "El apellido es obligatorio";
        if (!email?.trim()) nextErrors.email = "El correo electrónico es obligatorio";
        else if (!validateEmail(email)) nextErrors.email = "Correo electrónico inválido";
      }
      if (stepNum === 2) {
        if (!governmentId?.trim()) nextErrors.governmentId = "El documento de identidad es obligatorio";
        if (!birthDate) nextErrors.birthDate = "La fecha de nacimiento es obligatoria";
        if (!birthPlace?.trim()) nextErrors.birthPlace = "El lugar de nacimiento es obligatorio";
        if (!gender) nextErrors.gender = "El género es obligatorio";
        if (!maritalStatus) nextErrors.maritalStatus = "El estado civil es obligatorio";
        if (!academicInstruction) nextErrors.academicInstruction = "La formación académica es obligatoria";
      }
      if (stepNum === 3) {
        if (!hiringContractDate) nextErrors.hiringContractDate = "La fecha de contratación es obligatoria";
        if (!bloodType) nextErrors.bloodType = "El grupo sanguíneo es obligatorio";
        if (!guardCredentials?.trim()) nextErrors.guardCredentials = "Las credenciales son obligatorias";
        if (!address?.trim()) nextErrors.address = "La dirección es obligatoria";
        if (!phone?.trim()) nextErrors.phone = "El teléfono es obligatorio";
        if (!password) nextErrors.password = "La contraseña es obligatoria";
        if (!confirm) nextErrors.confirm = "Confirme la contraseña";
        if (password && confirm && password !== confirm) nextErrors.confirm = "Las contraseñas no coinciden";
      }
      return nextErrors;
    };

    const errors1 = collect(1);
    const errors2 = collect(2);
    const errors3 = collect(3);
    const merged = { ...errors1, ...errors2, ...errors3 };
    setErrors(merged);
    if (Object.keys(merged).length) return;

    setIsLoading(true);
    try {
      // If we fetched an invite object, merge it with only the changed fields
      let payload: any;
      if (fetched) {
        payload = { ...fetched };
        // Map form fields onto fetched structure, overriding where appropriate
        payload.firstName = firstName || payload.firstName;
        payload.lastName = lastName || payload.lastName;
        payload.email = email || payload.email;
        payload.governmentId = governmentId || payload.governmentId;
        payload.birthDate = birthDate || payload.birthDate;
        payload.birthPlace = birthPlace || payload.birthPlace;
        payload.gender = gender || payload.gender;
        payload.maritalStatus = maritalStatus || payload.maritalStatus;
        payload.academicInstruction = academicInstruction || payload.academicInstruction;
        payload.hiringContractDate = hiringContractDate || payload.hiringContractDate;
        payload.bloodType = bloodType || payload.bloodType;
        payload.guardCredentials = guardCredentials || payload.guardCredentials;
        payload.address = address || payload.address;
        payload.phoneNumber = phone || payload.phoneNumber || payload.guard?.phoneNumber || payload.phoneNumber;

        // Ensure nested guard object contains first/last/email/phone
        payload.guard = { ...(payload.guard || {}) };
        payload.guard.firstName = firstName || payload.guard.firstName || payload.firstName;
        payload.guard.lastName = lastName || payload.guard.lastName || payload.lastName;
        payload.guard.email = (email ?? payload.guard.email) ?? payload.email ?? null;
        payload.guard.phoneNumber = phone || payload.guard.phoneNumber || payload.phoneNumber || null;
        // Include password if user provided one so backend can set it on create
        if (password) payload.password = password;
      } else {
        payload = {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          governmentId: governmentId || undefined,
          birthDate: birthDate || undefined,
          birthPlace: birthPlace || undefined,
          gender: gender || undefined,
          maritalStatus: maritalStatus || undefined,
          academicInstruction: academicInstruction || undefined,
          hiringContractDate: hiringContractDate || undefined,
          bloodType: bloodType || undefined,
          guardCredentials: guardCredentials || undefined,
          address: address || undefined,
          phoneNumber: phone || undefined,
          password: password || undefined,
        };
      }

      if (inviteToken) payload.token = inviteToken;
      if (securityGuardId) payload.securityGuardId = securityGuardId;

      // Log final payload for backend debugging
      console.log("[registration] payload ->", payload);

      // Persist tenantId from fetched invite if missing so tenant-scoped endpoint can be used
      try {
        const existingTenant = localStorage.getItem("tenantId");
        if (!existingTenant && fetched && (fetched.tenantId || fetched.tenant)) {
          const tenantToSave = fetched.tenantId || (fetched.tenant as any);
          localStorage.setItem("tenantId", String(tenantToSave));
          console.debug("[registration] persisted tenantId ->", tenantToSave);
        }
      } catch (e) {
        console.warn("[registration] could not persist tenantId", e);
      }

      // Use tenant-scoped endpoint: POST /api/tenant/:tenantId/security-guard
      await securityGuardService.create(payload);

      toast.success("Registro completado");
      navigate("/login");
    } catch (err: any) {
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(err);
        if (result && result.fieldErrors) setErrors((p) => ({ ...p, ...result.fieldErrors }));
        if (result && result.messages && result.messages.length) result.messages.forEach((m) => toast.error(m));
        else {
          const msg = err?.message || "Error al registrar";
          toast.error(msg);
        }
      } catch (e) {
        const msg = err?.message || "Error al registrar";
        toast.error(msg);
      }
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Registro de Guardia">
      <form className="space-y-3" onSubmit={handleSubmit}>
        {inviteNotFound && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            Invitación no encontrada o inválida — puedes completar el formulario manualmente.
          </div>
        )}

        <div className="mb-2 flex items-center gap-6">
          <div className="flex-1 text-sm text-slate-600">Paso {step} de {totalSteps}</div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${s <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{s}</div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre<span style={{ color: "#F75638" }}>*</span></label>
              <Input className={`${formControl} ${errorClass('firstName')}`} value={firstName} onChange={(e: any) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: undefined })); }} placeholder="Nombre" disabled={isLoading || lockedFirstName} />
              {errors.firstName && <div className="text-red-600 text-sm mt-1">{errors.firstName}</div>}
            </div>
            <div>
              <label className={labelClass}>Apellido<span style={{ color: "#F75638" }}>*</span></label>
              <Input className={`${formControl} ${errorClass('lastName')}`} value={lastName} onChange={(e: any) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: undefined })); }} placeholder="Apellido" disabled={isLoading || lockedLastName} />
              {errors.lastName && <div className="text-red-600 text-sm mt-1">{errors.lastName}</div>}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Correo electrónico<span style={{ color: "#F75638" }}>*</span></label>
              <Input className={`${formControl} ${errorClass('email')}`} type="email" value={email} onChange={(e: any) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="Correo electrónico*" disabled={isLoading || lockedEmail} />
              {errors.email && <div className="text-red-600 text-sm mt-1">{errors.email}</div>}
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className={labelClass}>Documento de identidad<span style={{ color: "#F75638" }}>*</span></label>
                  <Input className={`${formControl} ${errorClass('governmentId')}`} value={governmentId} onChange={(e: any) => { setGovernmentId(e.target.value); setErrors((p) => ({ ...p, governmentId: undefined })); }} placeholder="Documento de identidad" disabled={isLoading} />
                {errors.governmentId && <div className="text-red-600 text-sm mt-1">{errors.governmentId}</div>}
              </div>
              <div>
                <label className={labelClass}>Fecha de nacimiento<span style={{ color: "#F75638" }}>*</span></label>
                <Input className={`${formControl} ${errorClass('birthDate')}`} type="date" value={birthDate} onChange={(e: any) => { setBirthDate(e.target.value); setErrors((p) => ({ ...p, birthDate: undefined })); }} disabled={isLoading} />
                {errors.birthDate && <div className="text-red-600 text-sm mt-1">{errors.birthDate}</div>}
              </div>
              <div>
                <label className={labelClass}>Lugar de nacimiento<span style={{ color: "#F75638" }}>*</span></label>
                <Input className={`${formControl} ${errorClass('birthPlace')}`} value={birthPlace} onChange={(e: any) => setBirthPlace(e.target.value)} placeholder="Lugar de nacimiento" disabled={isLoading} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className={labelClass}>Género<span style={{ color: "#F75638" }}>*</span></label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${formControl} ${errorClass('gender')}`} disabled={isLoading}>
                  <option value="">Seleccione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Estado civil<span style={{ color: "#F75638" }}>*</span></label>
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={`${formControl} ${errorClass('maritalStatus')}`} disabled={isLoading}>
                  <option value="">Seleccione</option>
                  <option value="Soltero">Soltero</option>
                  <option value="Casado">Casado</option>
                  <option value="Divorciado">Divorciado</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Formación académica<span style={{ color: "#F75638" }}>*</span></label>
                <select value={academicInstruction} onChange={(e) => setAcademicInstruction(e.target.value)} className={`${formControl} ${errorClass('academicInstruction')}`} disabled={isLoading}>
                  <option value="">Seleccione</option>
                  <option>Primaria</option>
                  <option>Secundaria</option>
                  <option>Universidad</option>
                </select>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className={labelClass}>Fecha de contratación<span style={{ color: "#F75638" }}>*</span></label>
                <Input className={`${formControl} ${errorClass('hiringContractDate')}`} type="date" value={hiringContractDate} onChange={(e: any) => setHiringContractDate(e.target.value)} disabled={isLoading} />
              </div>
              <div>
                <label className={labelClass}>Grupo sanguíneo<span style={{ color: "#F75638" }}>*</span></label>
                <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={`${formControl} ${errorClass('bloodType')}`} disabled={isLoading}>
                  <option value="">Seleccione</option>
                  <option>O+</option>
                  <option>O-</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Credenciales<span style={{ color: "#F75638" }}>*</span></label>
                <Input className={`${formControl} ${errorClass('guardCredentials')}`} value={guardCredentials} onChange={(e: any) => setGuardCredentials(e.target.value)} placeholder="Credenciales" disabled={isLoading} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>Dirección<span style={{ color: "#F75638" }}>*</span></label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección" className={`${formControl} min-h-[88px] resize-none ${errorClass('address')}`} disabled={isLoading} />
              </div>
              <div>
                <label className={labelClass}>Teléfono móvil<span style={{ color: "#F75638" }}>*</span></label>
                <Input className={`${formControl} ${errorClass('phone')}`} value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="p.ej. +12015550123" disabled={isLoading || lockedPhone} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>Contraseña<span style={{ color: "#F75638" }}>*</span></label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Contraseña*"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                    disabled={isLoading}
                    className={`${formControl} ${errorClass('password')}`}
                  />
                  <button type="button" className="absolute right-3 top-3" onClick={() => setShowPwd((v) => !v)}>{showPwd ? <EyeOff /> : <Eye />}</button>
                </div>
                {errors.password && <div className="text-red-600 text-sm mt-1">{errors.password}</div>}
              </div>

              <div>
                <label htmlFor="confirm-password" className={labelClass}>
                  Confirmar contraseña
                  <span style={{ color: "#F75638" }}>*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirmar contraseña*"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }}
                    disabled={isLoading}
                    className={`${formControl} ${errorClass('confirm')}`}
                  />
                  <button type="button" className="absolute right-3 top-3" onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? <EyeOff /> : <Eye />}</button>
                </div>
                {errors.confirm && <div className="text-red-600 text-sm mt-1">{errors.confirm}</div>}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            {step > 1 && (
              <button type="button" onClick={handlePrev} className="px-4 py-2 rounded-lg border">Volver</button>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            {step < totalSteps && (
              <button type="button" onClick={handleNext} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Siguiente</button>
            )}
            {step === totalSteps && (
              <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg bg-blue-600 text-white">{isLoading ? "Registrando..." : "Registrarse"}</button>
            )}
          </div>
        </div>

        <div className="text-center">
          <NavLink to="/login" className="text-sm font-semibold" style={{ color: "#F75638" }}>Volver a iniciar sesión</NavLink>
        </div>
      </form>
    </AuthLayout>
  );
}
