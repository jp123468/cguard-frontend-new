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
    // Use the dedicated invite endpoint so the server sends invitation emails/SMS
    const { data } = await api.post(`/tenant/${tenantId}/security-guard/invite`, { entries });
    return data;
  },

  async resendInvite(input: any) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/security-guard/invite`, input);
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
    const { data } = await api.patch(`/tenant/${tenantId}/security-guard/${id}`, input);

    return data;
  },

  async destroy(ids: string[]) {
    const tenantId = getTenantId();
    // Do not silence errors here; let the global interceptor show a helpful message
    const { data } = await api.delete(`/tenant/${tenantId}/security-guard`, { data: { ids } });

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

  // Notes CRUD
  async getSecurityGuardNotes(guardId: string, pagination: { limit?: number; offset?: number } = { limit: 25, offset: 0 }) {
    const tenantId = getTenantId();
    const params = new URLSearchParams();
    if (pagination.limit !== undefined) params.append('limit', String(pagination.limit));
    if (pagination.offset !== undefined) params.append('offset', String(pagination.offset));

    const { data } = await api.get<any>(`/tenant/${tenantId}/security-guard/${guardId}/notes?${params.toString()}`);
    return data;
  },

  async createSecurityGuardNote(guardId: string, payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.post<any>(`/tenant/${tenantId}/security-guard/${guardId}/notes`, payload);
    return data;
  },

  async updateSecurityGuardNote(guardId: string, noteId: string, payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.put<any>(`/tenant/${tenantId}/security-guard/${guardId}/notes/${noteId}`, payload);
    return data;
  },

  async destroySecurityGuardNote(guardId: string, noteId: string) {
    const tenantId = getTenantId();
    const { data } = await api.delete<any>(`/tenant/${tenantId}/security-guard/${guardId}/notes/${noteId}`);
    return data;
  },
};

export default securityGuardService;
