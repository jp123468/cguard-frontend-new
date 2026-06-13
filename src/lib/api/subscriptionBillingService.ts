import { ApiService } from "@/services/api/apiService";

const tenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

export interface BillingQuote {
  seats: number;
  perUserCents: number;
  platformFeeCents: number;
  monthlyCents: number;
  implementationCents: number;
  firstChargeCents: number;
  currency: string;
  netMonthlyCents: number;
}

export interface BillingSummary {
  status: string; // trialing | active | past_due | trial_expired | canceled
  trial: { endsAt: string | null; daysLeft: number; active: boolean; expired: boolean };
  seats: number;
  implementationPaid: boolean;
  hasSubscription: boolean;
  quote: BillingQuote;
  trialDays: number;
}

export interface BillableUser {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  status: string | null;
}

export const subscriptionBillingService = {
  summary(): Promise<BillingSummary> {
    return ApiService.get(`/tenant/${tenantId()}/subscription/summary`);
  },
  /** The users counted as billable seats (who the tenant pays for). */
  users(): Promise<BillableUser[]> {
    return ApiService.get(`/tenant/${tenantId()}/subscription/users`);
  },
  /** Returns a Stripe Checkout URL to redirect to. */
  checkout(): Promise<{ url: string; id: string }> {
    return ApiService.post(`/tenant/${tenantId()}/subscription/checkout`, {});
  },
};

export default subscriptionBillingService;
