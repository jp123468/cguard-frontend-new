import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, AlertTriangle } from "lucide-react";
import { subscriptionBillingService, BillingSummary } from "@/lib/api/subscriptionBillingService";

const CACHE_KEY = "cg_billing_summary";
const TTL_MS = 5 * 60 * 1000;

/**
 * Thin app-wide banner reminding the tenant about their trial / billing state.
 * Hidden entirely when the subscription is active. Summary is cached in
 * sessionStorage so it doesn't refetch on every navigation.
 */
export default function TrialBanner() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<BillingSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    // Use a fresh cached value if available.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < TTL_MS && data) {
          setSummary(data);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    subscriptionBillingService
      .summary()
      .then((data) => {
        if (!mounted) return;
        setSummary(data);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* no banner if it fails */
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!summary || summary.status === "active") return null;

  const go = () => navigate("/setting/billing");

  let cls = "bg-sky-500/10 text-sky-800 border-sky-200";
  let icon = <Clock size={15} className="shrink-0" />;
  let text = "";

  if (summary.status === "trialing") {
    text =
      summary.trial.daysLeft > 0
        ? t("billing.bannerTrialLeft", { defaultValue: "Prueba gratuita: te quedan {{n}} día(s).", n: summary.trial.daysLeft })
        : t("billing.bannerTrialToday", { defaultValue: "Tu prueba gratuita termina hoy." });
  } else if (summary.status === "trial_expired") {
    cls = "bg-amber-500/10 text-amber-800 border-amber-200";
    icon = <AlertTriangle size={15} className="shrink-0" />;
    text = t("billing.bannerExpired", { defaultValue: "Tu prueba gratuita terminó. Activa tu suscripción para seguir usando la plataforma." });
  } else if (summary.status === "past_due") {
    cls = "bg-red-500/10 text-red-800 border-red-200";
    icon = <AlertTriangle size={15} className="shrink-0" />;
    text = t("billing.bannerPastDue", { defaultValue: "Tu último pago falló. Actualiza tu suscripción para mantener el servicio." });
  } else {
    return null;
  }

  return (
    <div className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${cls}`}>
      <span className="flex items-center gap-2">
        {icon}
        {text}
      </span>
      <button
        onClick={go}
        className="shrink-0 rounded-md bg-[#f36a6d] px-3 py-1 text-xs font-semibold text-white hover:bg-[#e85b5f]"
      >
        {t("billing.activate", { defaultValue: "Activar suscripción" })}
      </button>
    </div>
  );
}
