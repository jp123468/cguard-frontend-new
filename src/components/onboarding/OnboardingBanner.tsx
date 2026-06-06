import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import onboardingService from "@/lib/api/onboardingService";
import {
  OnboardingTenant,
  getMissingFields,
  isBusinessSetUp,
  trialDaysLeft,
  isTrialing,
} from "./onboardingUtils";

interface OnboardingBannerProps {
  tenant: OnboardingTenant | null;
  /** True when the current user is a platform superadmin (hide for them). */
  isSuperadmin: boolean;
  onOpenWizard: () => void;
  onRefresh: () => Promise<any>;
}

/**
 * Sticky top banner that nags until the business profile is fully set up.
 * Stays visible across reloads while incomplete (it's a requirement). When
 * all required fields become present it auto-completes onboarding and hides.
 */
export default function OnboardingBanner({
  tenant,
  isSuperadmin,
  onOpenWizard,
  onRefresh,
}: OnboardingBannerProps) {
  const autoCompletingRef = useRef(false);

  const setUp = isBusinessSetUp(tenant);
  const completed = Boolean(tenant?.onboardingCompleted);

  // If everything is present but onboarding wasn't marked complete yet,
  // finalize it silently and refresh so the banner disappears for good.
  useEffect(() => {
    if (!tenant?.id) return;
    if (completed) return;
    if (!setUp) return;
    if (autoCompletingRef.current) return;
    autoCompletingRef.current = true;
    (async () => {
      try {
        await onboardingService.completeOnboarding(tenant.id as string);
        await onRefresh();
      } catch {
        // leave banner; user can finish via the wizard
        autoCompletingRef.current = false;
      }
    })();
  }, [tenant?.id, completed, setUp, onRefresh]);

  // Visibility: current tenant exists, not superadmin, and not set up & not completed.
  if (!tenant || !tenant.id) return null;
  if (isSuperadmin) return null;
  if (completed || setUp) return null;

  const missing = getMissingFields(tenant).slice(0, 3);
  const days = isTrialing(tenant.billingStatus) ? trialDaysLeft(tenant.trialEndsAt) : null;

  return (
    <div className="flex flex-col gap-2 border-b border-[#C8860A]/30 bg-gradient-to-r from-amber-50 to-amber-50/40 px-4 py-2.5 text-sm dark:from-amber-950/30 dark:to-amber-950/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5 sm:items-center">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#C8860A]/15 text-[#C8860A]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <span className="font-semibold text-foreground">Completa la configuración de tu empresa</span>
          {missing.length > 0 && (
            <span className="text-muted-foreground">
              {" "}— falta: {missing.join(", ")}
              {getMissingFields(tenant).length > 3 ? "…" : ""}
            </span>
          )}
          {days != null && (
            <span className="ml-1 font-medium text-[#C8860A]">
              · {days > 0 ? `Te quedan ${days} día${days === 1 ? "" : "s"} de prueba` : "Tu prueba termina hoy"}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onOpenWizard}
        className="shrink-0 self-start bg-[#C8860A] text-white hover:bg-[#B37809] sm:self-auto"
      >
        Continuar configuración <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
