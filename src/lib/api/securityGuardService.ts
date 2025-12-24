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

  async import(file: File | Blob, filename?: string) {
    const tenantId = getTenantId();
    const formData = new FormData();
    // If caller passed a filename, use it; if file is a File, use its name; otherwise fallback
    const nameToUse = filename ?? (file instanceof File ? file.name : undefined) ?? "upload.csv";
    formData.append("file", file as Blob, nameToUse);
    const { data } = await api.post(`/tenant/${tenantId}/security-guard/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    } as any);

    return data;
  },

  async update(id: string, input: any) {
    const tenantId = getTenantId();
    const { data } = await api.put(`/tenant/${tenantId}/security-guard/${id}`, input);

    return data;
  },

  async destroy(ids: string[]) {
    const tenantId = getTenantId();
    const { data } = await api.delete(`/tenant/${tenantId}/security-guard`, { data: { ids }, toast: { silentError: true } });

    return data;
  },

  async archive(ids: string[]) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard/archive`, { ids }, { toast: { silentError: true } });

    return data;
  },
  async restore(ids: string[]) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard/restore`, { ids }, { toast: { silentError: true } });

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

  async export(format: "excel" | "pdf" | "csv", params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params).toString()}&format=${format}` : `?format=${format}`;
    const response = await api.get(`/tenant/${tenantId}/security-guard/export${qs}`, {
      responseType: "blob",
      // prevent global error toast; page will show its own
      toast: { silentError: true },
    } as any);
    return response.data;
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
