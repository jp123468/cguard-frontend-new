import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiService } from "@/services/api/apiService";
import { toast } from "sonner";

/**
 * Blocking screen shown when an authenticated tenant user has NOT verified their
 * email. Email verification is mandatory: the backend 403s all tenant writes
 * until `emailVerified` is true, which otherwise surfaces as confusing errors
 * (and a broken onboarding). Instead we gate the app here with a clear call to
 * action: resend the verification email, or refresh once verified. We also poll
 * the profile so the screen clears automatically the moment the email is
 * verified in another tab.
 *
 * Rendered by ProtectedRoute (takes precedence over onboarding). Superadmins and
 * tenantless users are handled before this gate.
 */
export default function VerifyEmailGate() {
  const { user, signOut, refreshProfile } = useAuth();
  const email = user?.email || "";

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  // Cooldown countdown after a resend.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Auto-poll: detect verification done in another tab without a manual click.
  const pollingRef = useRef(false);
  useEffect(() => {
    const id = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        await refreshProfile();
      } catch {
        /* ignore */
      } finally {
        pollingRef.current = false;
      }
    }, 15000);
    return () => clearInterval(id);
  }, [refreshProfile]);

  const resend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      // Authenticated endpoint — uses the current user's email server-side.
      await ApiService.post("/auth/send-email-address-verification-email", {});
      toast.success("Te enviamos un nuevo correo de verificación.");
      setCooldown(60);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo reenviar el correo. Intenta de nuevo.");
    } finally {
      setResending(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const fresh = await refreshProfile();
      if (fresh && (fresh as any).emailVerified) {
        toast.success("¡Correo verificado!");
        // The gate unmounts on the next render once emailVerified is true.
      } else {
        toast.message("Aún no detectamos la verificación. Revisa tu correo (y la carpeta de spam).");
      }
    } catch {
      toast.error("No se pudo comprobar el estado. Intenta de nuevo.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="verify-email-title"
        className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-900"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-7 w-7 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>

        <h2
          id="verify-email-title"
          className="text-center text-lg font-semibold text-slate-900 dark:text-slate-50"
        >
          Verifica tu correo electrónico
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Para empezar a usar la plataforma debes confirmar tu correo. Te enviamos
          un enlace de verificación{email ? " a:" : "."}
        </p>
        {email && (
          <p className="mt-1 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
            {email}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
          Abre el enlace del correo y luego vuelve aquí. Esta pantalla se cerrará
          automáticamente cuando lo confirmes.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={checkNow}
            disabled={checking}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a96f08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-70"
          >
            {checking ? "Comprobando…" : "Ya verifiqué mi correo"}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={resending || cooldown > 0}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cooldown > 0
              ? `Reenviar correo (${cooldown}s)`
              : resending
                ? "Enviando…"
                : "Reenviar correo de verificación"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
