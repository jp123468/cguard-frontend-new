import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Building2, ShieldCheck, Check, X, Loader2, ArrowRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ApiService } from "@/services/api/apiService";
import { AuthService } from "@/services/auth/authService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AcceptInvitation — onboarding for INTERNAL administrative users (admins,
 * supervisors, dispatchers, office staff). Unlike clients (who use the Mi
 * Seguridad app), these users work in THIS CRM, so after setting their password
 * we sign them straight into the panel. Clean, modern split-panel UI.
 */

const RULES = [
  { id: "len", label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "Una letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "Un número", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "Un carácter especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operationsmanager: "Gerente de Operaciones",
  securitysupervisor: "Supervisor de Seguridad",
  supervisor: "Supervisor",
  hrmanager: "Gerente de RR.HH.",
  dispatcher: "Despachador",
  clientaccountmanager: "Gerente de Cuentas",
  administrativesupervisor: "Supervisor Administrativo",
  administrativeassistant: "Asistente Administrativo",
  secretary: "Secretaría",
};

function roleLabel(roles?: any): string | null {
  const arr: string[] = Array.isArray(roles) ? roles : roles ? [roles] : [];
  for (const r of arr) {
    const key = String(r || "").toLowerCase();
    if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  }
  return arr.length ? "Usuario administrativo" : null;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const rawToken = searchParams.get("token") || searchParams.get("invitationToken") || searchParams.get("invite") || undefined;
  const inviteToken = rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lockedEmail, setLockedEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [fetched, setFetched] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"form" | "signing-in">("form");
  const [inviteNotFound, setInviteNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    document.title = "Activa tu cuenta | CGuard Pro";
    const run = async () => {
      if (!inviteToken) { setInviteNotFound(true); setLoading(false); return; }
      // Clear any stale session so the invite flow starts clean.
      try { localStorage.removeItem("authToken"); localStorage.removeItem("user"); } catch { /* ignore */ }
      try {
        const res = await ApiService.get(`/user/public?token=${encodeURIComponent(inviteToken)}`, { skipAuth: true });
        const data = res?.data || res;
        if (!mounted.current) return;
        if (!data) { setInviteNotFound(true); return; }
        setFetched(data);
        const n = data.fullName || data.name || (data.firstName ? `${data.firstName} ${data.lastName || ""}`.trim() : "");
        if (n) setName(n);
        if (data.email) { setEmail(data.email); setLockedEmail(true); }
      } catch {
        if (mounted.current) setInviteNotFound(true);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    run();
  }, [inviteToken]);

  const passedRules = useMemo(() => RULES.filter((r) => r.test(password)).length, [password]);
  const strength = (passedRules / RULES.length) * 100;
  const strengthLabel = passedRules <= 2 ? "Débil" : passedRules <= 4 ? "Buena" : "Excelente";
  const strengthColor = passedRules <= 2 ? "bg-red-500" : passedRules <= 4 ? "bg-amber-500" : "bg-emerald-500";

  const canSubmit = name.trim() && email.trim() && passedRules === RULES.length && password === confirm && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passedRules !== RULES.length) { setError("La contraseña no cumple los requisitos."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setSubmitting(true);
    try {
      await AuthService.signUp({ email, password, invitationToken: inviteToken, name } as any);
      // Internal users belong in THIS CRM — sign them straight into the panel.
      setPhase("signing-in");
      const result = await signIn({ email, password });
      if (result?.success) {
        toast.success("¡Cuenta activada! Bienvenido.");
        navigate("/dashboard", { replace: true });
      } else {
        // Account created but auto-login failed — send them to login.
        toast.success("Cuenta activada. Inicia sesión para continuar.");
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      if (!mounted.current) return;
      setPhase("form");
      setError(err?.message || "No se pudo activar la cuenta. Verifica el enlace e inténtalo de nuevo.");
      toast.error(err?.message || "Error al activar la cuenta");
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const tenantName = fetched?.tenant?.name as string | undefined;
  const tenantLogo = fetched?.tenant?.logoUrl as string | undefined;
  const role = roleLabel(fetched?.roles);

  const inputCls = "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left — branding */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between overflow-hidden p-12 xl:p-16"
        style={{ background: "linear-gradient(145deg, #0F1923 0%, #1C2B3A 55%, #0F1923 100%)" }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#C8860A 1px, transparent 1px), linear-gradient(90deg, #C8860A 1px, transparent 1px)", backgroundSize: "46px 46px" }} />
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-[32rem] w-[32rem] rounded-full bg-[#F5C300] opacity-[0.06] blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          {tenantLogo ? (
            <img src={tenantLogo} alt={tenantName || "Logo"} className="h-14 object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15"><ShieldCheck className="h-6 w-6 text-primary" /></span>
              <span className="text-2xl font-bold text-white">{tenantName || "CGuard Pro"}</span>
            </div>
          )}
        </div>

        <div className="relative z-10 max-w-md">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#E8B84B]">
            <ShieldCheck className="h-3.5 w-3.5" /> Panel administrativo
          </p>
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] text-white">
            Te damos acceso a<span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #C8860A, #F5C300)" }}>{tenantName || "tu organización"}</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Configura tu contraseña y entra al panel para gestionar operaciones, vigilantes, incidentes y reportes en tiempo real.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" /> Acceso seguro al CRM <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            {tenantLogo ? <img src={tenantLogo} alt={tenantName || "Logo"} className="h-10 object-contain" /> : <><ShieldCheck className="h-7 w-7 text-primary" /><span className="text-lg font-bold text-foreground">{tenantName || "CGuard Pro"}</span></>}
          </div>

          {phase === "signing-in" ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
              <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-primary" />
              <p className="text-base font-semibold text-foreground">Accediendo al panel…</p>
              <p className="mt-1 text-sm text-muted-foreground">Un momento, estamos preparando tu cuenta.</p>
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inviteNotFound ? (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-500/10"><AlertCircle className="h-7 w-7 text-red-500" /></div>
              <h2 className="text-center text-xl font-bold text-foreground">Invitación no válida</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">El enlace de invitación no existe, ya fue usado o expiró. Pide a tu administrador que te reenvíe la invitación.</p>
              <button onClick={() => navigate("/login")} className="mt-6 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90">Ir a iniciar sesión</button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Activa tu cuenta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {role ? <>Has sido invitado como <span className="font-semibold text-foreground">{role}</span>{tenantName ? <> en <span className="font-semibold text-foreground">{tenantName}</span></> : null}.</> : "Completa tu registro para entrar al panel."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-7 shadow-xl space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Nombre completo</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" disabled={submitting} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Correo electrónico</label>
                  <div className="relative">
                    <input className={inputCls + " pr-10"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" disabled={submitting || lockedEmail} />
                    {lockedEmail && <Building2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Contraseña</label>
                  <div className="relative">
                    <input className={inputCls + " pr-10"} type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crea una contraseña segura" disabled={submitting} />
                    <button type="button" tabIndex={-1} onClick={() => setShowPwd((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {/* Strength meter */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Seguridad</span>
                        <span className={passedRules <= 2 ? "text-red-500" : passedRules <= 4 ? "text-amber-500" : "text-emerald-500"}>{strengthLabel}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full transition-all ${strengthColor}`} style={{ width: `${strength}%` }} />
                      </div>
                    </div>
                  )}
                  {/* Requirements checklist */}
                  <ul className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {RULES.map((r) => {
                      const ok = r.test(password);
                      return (
                        <li key={r.id} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {ok ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0 opacity-50" />} {r.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Confirmar contraseña</label>
                  <input className={inputCls} type={showPwd ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" disabled={submitting} />
                  {confirm && password !== confirm && <p className="mt-1 text-[11px] text-red-500">Las contraseñas no coinciden.</p>}
                </div>

                <button type="submit" disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Activar y entrar al panel <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">{tenantName ? `© ${new Date().getFullYear()} ${tenantName}` : "CGuard Pro"} · Acceso seguro</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
