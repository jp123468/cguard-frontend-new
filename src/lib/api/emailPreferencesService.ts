import { ApiService } from "@/services/api/apiService";

const tenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

export interface EmailCatalogItem {
  key: string;
  label: string;
  description: string;
  category: string;
  locked?: boolean;
  eventType?: string;
}

export interface EmailBranding {
  brandColor: string;
  headerColor: string;
}

export interface EmailPreferencesResponse {
  catalog: EmailCatalogItem[];
  preferences: Record<string, boolean>;
  branding?: EmailBranding;
  logoUrl?: string | null;
}

export const emailPreferencesService = {
  get(): Promise<EmailPreferencesResponse> {
    return ApiService.get(`/tenant/${tenantId()}/email-preferences`);
  },

  update(
    preferences: Record<string, boolean>,
    branding?: EmailBranding,
  ): Promise<EmailPreferencesResponse> {
    return ApiService.put(`/tenant/${tenantId()}/email-preferences`, {
      data: { preferences, ...(branding ? { branding } : {}) },
    });
  },

  /** Render a sample transactional email with DRAFT branding for live preview. */
  preview(branding?: EmailBranding): Promise<{ html: string }> {
    return ApiService.post(`/tenant/${tenantId()}/email-preferences/preview`, {
      data: { ...(branding ? { branding } : {}) },
    });
  },
};

export default emailPreferencesService;
