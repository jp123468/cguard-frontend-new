import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, Ban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Full-screen hard lockout for tenants whose access has been cut off:
 *  - "canceled": subscription canceled. They can still reach the billing page
 *    to re-subscribe, so we offer that CTA.
 *  - "suspended": administrative hold (superadmin). No self-serve recovery —
 *    they must contact support.
 */
export default function SubscriptionLockedScreen({
  variant,
}: {
  variant: "canceled" | "suspended";
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth() as any;

  const suspended = variant === "suspended";

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#F8F7F4] px-6 text-center dark:bg-[#0A0A0A]">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          suspended ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
        }`}
      >
        {suspended ? <Ban size={30} /> : <Lock size={30} />}
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">
          {suspended
            ? t("billing.lockedSuspendedTitle", { defaultValue: "Cuenta suspendida" })
            : t("billing.lockedCanceledTitle", { defaultValue: "Suscripción cancelada" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {suspended
            ? t("billing.lockedSuspendedMsg", { defaultValue: "El acceso a esta cuenta fue suspendido por el administrador de la plataforma. Contacta a soporte para reactivarla." })
            : t("billing.lockedCanceledMsg", { defaultValue: "Tu suscripción fue cancelada. Reactívala para volver a usar la plataforma." })}
        </p>
      </div>

      <div className="flex gap-3">
        {!suspended && (
          <button
            onClick={() => navigate("/setting/billing")}
            className="rounded-md bg-[#f36a6d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e85b5f]"
          >
            {t("billing.lockedReactivate", { defaultValue: "Reactivar suscripción" })}
          </button>
        )}
        <button
          onClick={() => {
            try {
              signOut?.();
            } catch {
              /* ignore */
            }
          }}
          className="rounded-md border border-default-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-default-100"
        >
          {t("billing.lockedSignOut", { defaultValue: "Cerrar sesión" })}
        </button>
      </div>
    </div>
  );
}
