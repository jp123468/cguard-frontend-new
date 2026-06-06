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

export interface EmailPreferencesResponse {
  catalog: EmailCatalogItem[];
  preferences: Record<string, boolean>;
}

export const emailPreferencesService = {
  get(): Promise<EmailPreferencesResponse> {
    return ApiService.get(`/tenant/${tenantId()}/email-preferences`);
  },

  update(preferences: Record<string, boolean>): Promise<EmailPreferencesResponse> {
    return ApiService.put(`/tenant/${tenantId()}/email-preferences`, { data: { preferences } });
  },
};

export default emailPreferencesService;
