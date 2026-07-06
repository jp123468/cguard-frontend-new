import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Sparkles, CreditCard, Check, Loader2 } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Section,
  Field,
  StatusBadge,
} from "@/components/kit";
import {
  subscriptionBillingService,
  BillingSummary,
} from "@/lib/api/subscriptionBillingService";

type BillingPeriod = "monthly" | "annual";
type PlanKey = "essential" | "advance" | "professional";

const PLAN_LABEL: Record<PlanKey, string> = {
  essential: "Essential",
  advance: "Advance",
  professional: "Professional",
};

const MONTHLY_PRICE: Record<PlanKey, number> = {
  essential: 5,
  advance: 8,
  professional: 10,
};

const ANNUAL_PRICE: Record<PlanKey, number> = {
  essential: 4.25,
  advance: 6.8,
  professional: 8.5,
};

type BadgeTone = "blue" | "green" | "red" | "orange" | "slate";
const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  trialing: { label: "Prueba gratuita", tone: "blue" },
  active: { label: "Activo", tone: "green" },
  past_due: { label: "Pago vencido", tone: "red" },
  trial_expired: { label: "Prueba expirada", tone: "orange" },
  canceled: { label: "Cancelado", tone: "slate" },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SubscriptionDetailsModule() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const summary = await subscriptionBillingService.summary();
        if (active) setData(summary);
      } catch {
        if (active)
          toast.error("No se pudo cargar la suscripción");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isAnnual = period === "annual";
  const priceByPeriod = useMemo(
    () => (isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE),
    [isAnnual]
  );

  // The real backend uses a per-seat pricing model, not the tiered
  // essential/advance/professional plans shown below — so plan purchases
  // are NOT wired here. Highlight the current tier only if it maps.
  const currentPlan: PlanKey | null = useMemo(() => {
    const key = data?.plan?.key?.toLowerCase();
    if (key && key in PLAN_LABEL) return key as PlanKey;
    return null;
  }, [data]);

  const status = data?.status || "trialing";
  const meta = STATUS_META[status] || STATUS_META.trialing;
  const goToBilling = () => navigate("/setting/billing");

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={<CreditCard />}
        title="Suscripción"
        subtitle="Gestiona tu plan, periodo de facturación y módulos contratados."
      />

      {/* Banner */}
      <Card className="p-4 rounded-2xl bg-primary/10 border-primary/30">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary [&_svg]:size-5">
            <Sparkles />
          </span>
          <p className="text-sm">
            <span className="font-semibold">Special Offer!!</span> Update Now and
            Get 15% Off For Next 3 Months!! Your account will be immediately
            charged based on number of active users in the system.{" "}
            <button
              className="text-primary underline-offset-2 hover:underline"
              onClick={goToBilling}
            >
              (Click Here)
            </button>
          </p>
        </div>
      </Card>

      {/* Información de suscripción */}
      <Section
        title="Información de suscripción"
        icon={<CreditCard />}
        action={
          <Button variant="outline" onClick={goToBilling}>
            Gestionar Suscripción
          </Button>
        }
      >
        {loading ? (
          <div className="flex min-h-[8rem] items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-6">
          <Field
            label="Plan"
            value={data?.plan?.name || (currentPlan ? PLAN_LABEL[currentPlan] : "—")}
          />
          <Field
            label="Periodo de prueba"
            value={
              data?.trial?.endsAt
                ? `Termina el ${fmtDate(data.trial.endsAt)}`
                : "—"
            }
          />
          <div className="min-w-0">
            <div className="cg-eyebrow mb-0.5">Estado de la Suscripción</div>
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          </div>
          <Field
            label="Usuarios facturables"
            value={String(data?.seats ?? "—")}
          />
        </div>
        )}

        <Separator className="my-6" />

        {/* Selector Mensual / Anual */}
        <div className="flex justify-center">
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as BillingPeriod)}
            className="rounded-xl border p-1 bg-muted/50"
          >
            <ToggleGroupItem value="monthly" className="px-6 rounded-lg">
              Mensual
            </ToggleGroupItem>
            <ToggleGroupItem value="annual" className="px-6 rounded-lg">
              Anual
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Nota: la contratación real de la suscripción se gestiona en la
            página de Suscripción (facturación por usuario con Stripe). Los
            planes por niveles de abajo son referenciales y no se pueden
            comprar desde aquí. */}
        <p className="mt-4 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
          Los cambios de plan y pagos se gestionan en{" "}
          <button
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={goToBilling}
          >
            Suscripción / Facturación
          </button>
          .
        </p>

        {/* Planes (referenciales) */}
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {(["essential", "advance", "professional"] as PlanKey[]).map(
            (plan) => {
              const price = priceByPeriod[plan];
              const isCurrent = plan === currentPlan;
              const isPopular = plan === "professional";
              return (
                <Card
                  key={plan}
                  className={`p-6 flex flex-col gap-4 rounded-2xl transition-shadow hover:shadow-md ${
                    isPopular ? "border-primary/40 ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{PLAN_LABEL[plan]}</h3>
                    {isPopular && <StatusBadge tone="primary" dot={false}>POPULAR</StatusBadge>}
                  </div>

                  <div className="space-y-1">
                    <div className="font-display text-3xl font-bold">
                      {isAnnual ? `$${price.toFixed(2)}` : `$${price}`}
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / mes / usuario
                      </span>
                    </div>
                    {isAnnual && (
                      <div className="text-xs text-muted-foreground">
                        + 15% Descuento en todos los complementos
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    {isCurrent ? (
                      <Button className="w-full" variant="brand" disabled>
                        <Check className="h-4 w-4 mr-1.5" /> Plan Actual
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isPopular ? "brand" : "outline"}
                        disabled
                        title="Gestiona tu plan en Suscripción / Facturación"
                      >
                        Próximamente
                      </Button>
                    )}
                  </div>
                </Card>
              );
            }
          )}
        </div>
      </Section>
    </PageContainer>
  );
}
