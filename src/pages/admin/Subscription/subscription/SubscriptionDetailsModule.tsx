import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";

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
    <div className="space-y-6">
      {/* Banner */}
      <Card className="p-4 bg-orange-50 border-orange-200">
        <p className="text-sm">
          <span className="font-semibold">Special Offer!!</span> Update Now and
          Get 15% Off For Next 3 Months!! Your account will be immediately
          charged based on number of active users in the system.{" "}
          <button
            className="text-orange-600 underline-offset-2 hover:underline"
            onClick={() => console.log("Click en oferta")}
          >
            (Click Here)
          </button>
        </p>
      </Card>

      {/* Información de suscripción */}
      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Cliente</div>
            <div className="font-medium">
              michaelurresta@seguridadbas.com
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Creado</div>
            <div className="font-medium">Oct 07, 2025</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">Periodo Actual</div>
            <div className="font-medium">
              Oct 07, 2025 to Nov 06, 2025
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-muted-foreground">
              Estado de la Suscripción
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="bg-rose-100 text-rose-700"
              >
                Trialing
              </Badge>
              <Button
                variant="outline"
                onClick={() => console.log("Gestionar suscripción")}
              >
                Gestionar Suscripción
              </Button>
            </div>
          </div>

          <div className="space-y-1 col-span-2">
            <div className="text-muted-foreground">Usuarios Activos</div>
            <div className="font-medium">3</div>
          </div>
        </div>

        <Separator />

        {/* Selector Mensual / Anual */}
        <div className="flex justify-center">
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as BillingPeriod)}
            className="rounded-md border p-1 bg-muted/50"
          >
            <ToggleGroupItem value="monthly" className="px-6">
              Mensual
            </ToggleGroupItem>
            <ToggleGroupItem value="annual" className="px-6">
              Anual
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Planes */}
        <div className="grid md:grid-cols-3 gap-6">
          {(["essential", "advance", "professional"] as PlanKey[]).map(
            (plan) => {
              const price = priceByPeriod[plan];
              const isCurrent = plan === currentPlan;
              return (
                <Card key={plan} className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{PLAN_LABEL[plan]}</h3>
                    {plan === "professional" && (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-100 text-indigo-700"
                      >
                        POPULAR
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-semibold">
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
                      <Button className="w-full" variant="default">
                        Plan Actual
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan === "professional" ? "default" : "outline"}
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
      </Card>

      {/* Modal de Confirmación */}
      <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Confirm Subscription Changes</DialogTitle>
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
                className="text-orange-600 underline"
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
                className="text-orange-600 underline"
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
    </div>
  );
}
