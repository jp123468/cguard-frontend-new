import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, CreditCard, Users, CheckCircle2, Clock, AlertTriangle, Sparkles } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscriptionBillingService, BillingSummary } from "@/lib/api/subscriptionBillingService";

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency }).format((cents || 0) / 100);
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  trialing: { label: "Prueba gratuita", cls: "bg-sky-500/15 text-sky-700" },
  active: { label: "Activo", cls: "bg-green-500/15 text-green-700" },
  past_due: { label: "Pago vencido", cls: "bg-red-500/15 text-red-700" },
  trial_expired: { label: "Prueba expirada", cls: "bg-amber-500/15 text-amber-700" },
  canceled: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

export default function BillingPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await subscriptionBillingService.summary());
    } catch {
      toast.error(t("billing.loadError", { defaultValue: "No se pudo cargar la facturación" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    if (p.get("activated") === "success") {
      toast.success(t("billing.activated", { defaultValue: "¡Suscripción activada! Gracias." }));
      setTimeout(load, 3000);
    } else if (p.get("activated") === "cancel") {
      toast.info(t("billing.activateCancel", { defaultValue: "Activación cancelada" }));
    }
    // eslint-disable-next-line
  }, []);

  const activate = async () => {
    setActivating(true);
    try {
      const res = await subscriptionBillingService.checkout();
      if (res?.url) window.location.href = res.url;
      else toast.error(t("billing.checkoutError", { defaultValue: "No se pudo iniciar el pago" }));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t("billing.checkoutError", { defaultValue: "No se pudo iniciar el pago" }));
    } finally {
      setActivating(false);
    }
  };

  const status = data?.status || "trialing";
  const meta = STATUS_META[status] || STATUS_META.trialing;
  const q = data?.quote;
  const currency = q?.currency || "USD";
  const isActive = status === "active";

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title={t("settings.configuracion.billing", { defaultValue: "Suscripción" })}>
        <div className="mx-auto max-w-2xl">
          {loading || !data ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="animate-spin text-[#C8860A]" size={28} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <CreditCard size={18} className="text-[#C8860A]" />
                      {t("billing.title", { defaultValue: "Estado de la suscripción" })}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {status === "trialing" && (
                    <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-500/10 p-3 text-sm text-sky-800">
                      <Clock size={16} className="mt-0.5 shrink-0" />
                      <span>
                        {data.trial.daysLeft > 0
                          ? t("billing.trialLeft", { defaultValue: "Te quedan {{n}} día(s) de prueba gratuita.", n: data.trial.daysLeft })
                          : t("billing.trialEndsToday", { defaultValue: "Tu prueba gratuita termina hoy." })}
                        {data.trial.endsAt && ` (${new Date(data.trial.endsAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })})`}
                      </span>
                    </div>
                  )}
                  {status === "trial_expired" && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-sm text-amber-800">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>{t("billing.expired", { defaultValue: "Tu prueba gratuita terminó. Activa tu suscripción para seguir usando la plataforma." })}</span>
                    </div>
                  )}
                  {status === "past_due" && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 p-3 text-sm text-red-800">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>{t("billing.pastDue", { defaultValue: "Tu último pago falló. Actualiza tu método de pago para mantener el servicio." })}</span>
                    </div>
                  )}
                  {isActive && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 size={16} /> {t("billing.activeMsg", { defaultValue: "Tu suscripción está activa." })}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users size={15} /> {t("billing.seats", { defaultValue: "Usuarios facturables" })}
                    </span>
                    <span className="font-semibold text-foreground">{data.seats}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Price breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("billing.costTitle", { defaultValue: "Tu plan" })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {money(q!.perUserCents, currency)} × {data.seats} {t("billing.users", { defaultValue: "usuarios" })}
                    </span>
                    <span className="text-foreground">{money(q!.perUserCents * data.seats, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("billing.processing", { defaultValue: "Procesamiento de pago" })}</span>
                    <span className="text-foreground">{money(q!.platformFeeCents, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                    <span>{t("billing.monthly", { defaultValue: "Total mensual" })}</span>
                    <span>{money(q!.monthlyCents, currency)}/mes</span>
                  </div>

                  {!data.implementationPaid && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Sparkles size={15} /> {t("billing.implementation", { defaultValue: "Implementación (pago único)" })}
                      </span>
                      <span className="font-semibold text-foreground">{money(q!.implementationCents, currency)}</span>
                    </div>
                  )}

                  {!isActive && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-[#C8860A]/30 bg-[#C8860A]/5 px-3 py-3">
                      <div className="text-sm">
                        <div className="font-semibold text-foreground">{t("billing.firstCharge", { defaultValue: "Primer cargo hoy" })}</div>
                        <div className="text-xs text-muted-foreground">{t("billing.thenMonthly", { defaultValue: "Luego {{m}}/mes", m: `${money(q!.monthlyCents, currency)}` })}</div>
                      </div>
                      <div className="text-lg font-bold text-[#C8860A]">{money(q!.firstChargeCents, currency)}</div>
                    </div>
                  )}

                  <p className="pt-1 text-xs text-muted-foreground">
                    {t("billing.feeNote", { defaultValue: "Los precios incluyen las comisiones de procesamiento de Stripe. Facturación mensual; el número de usuarios se ajusta automáticamente." })}
                  </p>
                </CardContent>
              </Card>

              {/* CTA */}
              {!isActive && (
                <div className="flex justify-end">
                  <Button onClick={activate} disabled={activating} className="bg-[#f36a6d] text-white hover:bg-[#e85b5f]">
                    {activating ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CreditCard className="mr-2" size={16} />}
                    {t("billing.activate", { defaultValue: "Activar suscripción" })}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}
