import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  extractOnboardingTenant,
  trialDaysLeft,
  isTrialing,
} from "@/components/onboarding/onboardingUtils";

/**
 * Small persistent header pill showing "Prueba: N días" while the tenant's
 * billingStatus === 'trialing'. Hidden once the subscription is active.
 */
export default function TrialDaysBadge() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const tenant = useMemo(() => extractOnboardingTenant(user), [user]);

  if (!tenant || !isTrialing(tenant.billingStatus)) return null;

  const days = trialDaysLeft(tenant.trialEndsAt);
  if (days == null) return null;

  const urgent = days <= 3;
  const label = days > 0 ? `Prueba: ${days} día${days === 1 ? "" : "s"}` : "Prueba: termina hoy";

  return (
    <button
      type="button"
      onClick={() => navigate("/setting/billing")}
      title="Ver detalles de tu prueba y suscripción"
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        urgent
          ? "border-red-300 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:border-red-900"
          : "border-[#C8860A]/30 bg-[#C8860A]/10 text-[#C8860A] hover:bg-[#C8860A]/15",
      ].join(" ")}
    >
      <Gift className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{days > 0 ? `${days}d` : "hoy"}</span>
    </button>
  );
}
