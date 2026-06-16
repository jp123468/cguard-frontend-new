import { ApiService } from "@/services/api/apiService";

/**
 * Frontend client for the unified communications layer (Configuración →
 * Comunicaciones). Talks ONLY to the authed, tenant-scoped endpoints:
 *   GET/PUT /tenant/:t/communications/settings
 *   GET     /tenant/:t/communications/logs
 *   GET     /tenant/:t/communications/wallet
 *
 * Secrets (Meta access token, app secret, webhook verify token) are NEVER
 * handled here — only non-secret identifiers (phone number id, business
 * account id) which the backend stores on the tenant settings blob.
 */

const tenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

export type Channel = "push" | "whatsapp" | "sms" | "email";
export type Provider = "fcm" | "meta" | "twilio" | "smtp" | string;
export type DeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "skipped";
export type MessageType =
  | "otp"
  | "shift_reminder"
  | "incident_alert"
  | "visitor_alert"
  | "ronda_alert"
  | "task_alert"
  | "no_show"
  | "panic"
  | "new_assignment"
  | "escalation"
  | "generic"
  | string;

/** Mirror of the backend CommunicationSettings blob (defaults merged server-side). */
export interface CommunicationSettings {
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  whatsapp_provider: "meta";
  sms_provider: "twilio";
  critical_alert_sms_fallback: boolean;
  otp_preferred_channel: "whatsapp" | "sms";
  wallet_required_for_paid_channels: boolean;
  low_balance_threshold: number;
  allow_negative_communications_balance: boolean;
  default_country_code: string;
  timezone: string | null;
  whatsapp_shift_reminders: boolean;
  whatsapp_incidents: boolean;
  sms_critical: boolean;
  // Non-secret Meta identifiers stored on the settings blob (NOT secrets).
  meta_phone_number_id?: string | null;
  meta_business_account_id?: string | null;
  [key: string]: any;
}

export interface WalletSnapshot {
  balanceCents: number;
  currency: string;
  lowBalanceThresholdCents: number;
  belowThreshold: boolean;
}

export interface CommunicationLog {
  id: string;
  tenantId: string;
  userId: string | null;
  recipient: string;
  channel: Channel;
  provider: string;
  messageType: MessageType;
  status: DeliveryStatus;
  providerMessageId: string | null;
  providerResponse: any | null;
  errorMessage: string | null;
  costEstimateCents: number | null;
  billedAmountCents: number | null;
  currency: string;
  deepLink: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
}

export interface LogsResult {
  rows: CommunicationLog[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LogsFilters {
  channel?: string;
  provider?: string;
  status?: string;
  type?: string; // maps to messageType server-side
  from?: string; // ISO date
  to?: string; // ISO date
  page?: number;
  limit?: number;
}

function buildQuery(filters: LogsFilters): string {
  const entries: [string, string][] = [];
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    entries.push([k, String(v)]);
  });
  const qs = new URLSearchParams(entries).toString();
  return qs ? `?${qs}` : "";
}

export const communicationService = {
  getSettings(): Promise<CommunicationSettings> {
    return ApiService.get(`/tenant/${tenantId()}/communications/settings`);
  },

  updateSettings(
    patch: Partial<CommunicationSettings>,
  ): Promise<CommunicationSettings> {
    return ApiService.put(`/tenant/${tenantId()}/communications/settings`, {
      data: patch,
    });
  },

  getWallet(): Promise<WalletSnapshot> {
    return ApiService.get(`/tenant/${tenantId()}/communications/wallet`);
  },

  getLogs(filters: LogsFilters = {}): Promise<LogsResult> {
    return ApiService.get(
      `/tenant/${tenantId()}/communications/logs${buildQuery(filters)}`,
    );
  },
};

export default communicationService;
