import api, { getAuthToken } from "../api";

// Reuse tenantId retrieval pattern
const getTenantId = (): string => {
  const t = localStorage.getItem("tenantId");

  if (!t) {
    throw new Error("Tenant ID no configurado");
  }

  return t;
};

export const securityGuardService = {
  async create(input: any) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard`, input);
    return data;
  },

  async invite(entries: any[]) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard`, { entries });
    return data;
  },

  async joinByCode(code: string, entries: any[]) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard`, { code, entries });

    return data;
  },

  async inviteByLink(link: string, entries: any[]) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard`, { link, entries });

    return data;
  },

  async import(file: File) {
    const tenantId = getTenantId();
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/tenant/${tenantId}/security-guard/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    return data;
  },

  async update(id: string, input: any) {
    const tenantId = getTenantId();
    const { data } = await api.put(`/tenant/${tenantId}/security-guard/${id}`, input);

    return data;
  },

  async destroy(ids: string[]) {
    const tenantId = getTenantId();
    const { data } = await api.delete(`/tenant/${tenantId}/security-guard`, { data: { ids } });

    return data;
  },

  async autocomplete(query: string, limit = 10) {
    const tenantId = getTenantId();
    const { data } = await api.get(`/tenant/${tenantId}/security-guard/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);

    return data;
  },

  async list(params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    const { data } = await api.get(`/tenant/${tenantId}/security-guard${qs}`);

    return data;
  },

  async find(id: string) {
    const tenantId = getTenantId();
    const { data } = await api.get(`/tenant/${tenantId}/security-guard/${id}`, {
      // Prevent the global API interceptor from showing its own toast for this call.
      // The component will display a user-friendly toast once.
      toast: { silentError: true },
    } as any);
    return data;
  },

  // Alias para compatibilidad
  get(id: string) {
    return securityGuardService.find(id);
  },
};

export default securityGuardService;
