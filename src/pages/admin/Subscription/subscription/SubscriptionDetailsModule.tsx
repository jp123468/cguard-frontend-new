import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Sparkles, CreditCard, Check } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Section,
  Field,
  StatusBadge,
} from "@/components/kit";

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

export default function SubscriptionDetailsModule() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);

  const isAnnual = period === "annual";
  const priceByPeriod = useMemo(
    () => (isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE),
    [isAnnual]
  );

  const currentPlan: PlanKey = "professional"; // solo visual
  const handleBuy = (plan: PlanKey) => {
    setPendingPlan(plan);
    setOpenConfirm(true);
  };
  const handleConfirm = () => {
    console.log(
      `Confirmado cambio/compra al plan: ${pendingPlan} (${period})`
    );
    setOpenConfirm(false);
  };

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
              onClick={() => console.log("Click en oferta")}
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
          <Button
            variant="outline"
            onClick={() => console.log("Gestionar suscripción")}
          >
            Gestionar Suscripción
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-6">
          <Field
            label="Cliente"
            value={
              /* Mock screen — no real customer PII is committed here.
                 Replace with backend-driven data when billing is wired up. */
              "—"
            }
          />
          <Field label="Creado" value="Oct 07, 2025" />
          <Field label="Periodo Actual" value="Oct 07, 2025 to Nov 06, 2025" />
          <div className="min-w-0">
            <div className="cg-eyebrow mb-0.5">Estado de la Suscripción</div>
            <StatusBadge tone="red">Trialing</StatusBadge>
          </div>
          <Field className="col-span-2" label="Usuarios Activos" value="3" />
        </div>

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

        {/* Planes */}
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
                    {isCurrent && plan === "professional" &&
                    period === "monthly" ? (
                      <Button className="w-full" variant="brand">
                        <Check className="h-4 w-4 mr-1.5" /> Plan Actual
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isPopular ? "brand" : "outline"}
                        onClick={() => handleBuy(plan)}
                      >
                        {`Comprar ${PLAN_LABEL[plan]}`}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            }
          )}
        </div>
      </Section>

      {/* Modal de Confirmación */}
      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Confirm Subscription Changes</DialogTitle>
            <DialogDescription>
              Revisa los cambios de suscripción antes de confirmar la operación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                During the Subscription Term and any renewal terms, you may
                choose to cancel your subscription early, provided that, we
                will not provide any refunds and you will promptly pay all
                unpaid fees through the end of the Subscription Term.
              </li>
              <li>
                While upgrading or downgrading your subscription, actual
                amount may be different based on your proration charges.
              </li>
              <li>
                After downgrading your subscription, remaining balance will
                be added to your credit balance and balance will be adjusted
                in next invoice.
              </li>
              <li>
                We do not provide refunds if you decide to stop using the
                GuardsPro subscription during your Subscription Term.
              </li>
            </ul>
            <p>
              I have read, understand and accept the GuardsPro Customer{" "}
              <a
                href="#"
                className="text-primary underline"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Open Terms of Service");
                }}
              >
                Terms of Service
              </a>
              , including the GuardsPro{" "}
              <a
                href="#"
                className="text-primary underline"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Open Privacy Policy");
                }}
              >
                Privacy Policy
              </a>
              . By clicking "Confirm" below, I agree that GuardsPro is
              authorized to charge me for all fees due during the Subscription
              Term and any renewal term.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
