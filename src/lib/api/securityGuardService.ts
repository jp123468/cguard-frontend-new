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
    const resp = await api.post(`/tenant/${tenantId}/security-guard`, input);
    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async invite(entries: any[]) {
    const tenantId = getTenantId();
    // Use the dedicated invite endpoint so the server sends invitation emails/SMS
    const resp = await api.post(`/tenant/${tenantId}/security-guard/invite`, { entries });
    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async resendInvite(input: any) {
    const tenantId = getTenantId();
    const resp = await api.post(`/tenant/${tenantId}/security-guard/invite`, input);
    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async joinByCode(code: string, entries: any[]) {
    const tenantId = getTenantId();
    const resp = await api.post(`/tenant/${tenantId}/security-guard`, { code, entries });

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async inviteByLink(link: string, entries: any[]) {
    const tenantId = getTenantId();
    const resp = await api.post(`/tenant/${tenantId}/security-guard`, { link, entries });

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async import(file: File | Blob, filename?: string) {
    const tenantId = getTenantId();
    const formData = new FormData();
    // If caller passed a filename, use it; if file is a File, use its name; otherwise fallback
    const nameToUse = filename ?? (file instanceof File ? file.name : undefined) ?? "upload.csv";
    formData.append("file", file as Blob, nameToUse);
    const resp = await api.post(`/tenant/${tenantId}/security-guard/import`, formData);

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async update(id: string, input: any) {
    const tenantId = getTenantId();
    const resp = await api.patch(`/tenant/${tenantId}/security-guard/${id}`, input);

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async destroy(ids: string[]) {
    const tenantId = getTenantId();
    // Do not silence errors here; let the global interceptor show a helpful message
    const resp = await api.delete(`/tenant/${tenantId}/security-guard`, { data: { ids } });

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async archive(ids: string[]) {
    const tenantId = getTenantId();
    const resp = await api.post(`/tenant/${tenantId}/security-guard/archive`, { ids }, { toast: { silentError: true } });

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },
  async restore(ids: string[]) {
    const tenantId = getTenantId();
    const resp = await api.post(`/tenant/${tenantId}/security-guard/restore`, { ids }, { toast: { silentError: true } });

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async autocomplete(query: string, limit = 10) {
    const tenantId = getTenantId();
    const resp = await api.get(`/tenant/${tenantId}/security-guard/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async list(params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    const resp = await api.get(`/tenant/${tenantId}/security-guard${qs}`);

    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async export(format: "excel" | "pdf" | "csv", params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params).toString()}&format=${format}` : `?format=${format}`;
    const response = await api.get(`/tenant/${tenantId}/security-guard/export${qs}`, {
      responseType: "blob",
      // prevent global error toast; page will show its own
      toast: { silentError: true },
    } as any);
    return response && (response as any).data !== undefined ? (response as any).data : response;
  },

  async find(id: string) {
    const tenantId = getTenantId();
    const resp = await api.get(`/tenant/${tenantId}/security-guard/${id}`, {
      // Prevent the global API interceptor from showing its own toast for this call.
      // The component will display a user-friendly toast once.
      toast: { silentError: true },
    } as any);
    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
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

  // Licenses CRUD for a guard
  async getSecurityGuardLicenses(guardId: string, pagination: { limit?: number; offset?: number } = { limit: 25, offset: 0 }) {
    const tenantId = getTenantId();
    const params = new URLSearchParams();
    if (pagination.limit !== undefined) params.append('limit', String(pagination.limit));
    if (pagination.offset !== undefined) params.append('offset', String(pagination.offset));

    const { data } = await api.get<any>(`/tenant/${tenantId}/security-guard/${guardId}/licenses?${params.toString()}`);
    return data;
  },

  async createSecurityGuardLicense(guardId: string, payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.post<any>(`/tenant/${tenantId}/security-guard/${guardId}/licenses`, payload);
    return data;
  },

  async getSecurityGuardLicense(guardId: string, licenseId: string) {
    const tenantId = getTenantId();
    const { data } = await api.get<any>(`/tenant/${tenantId}/security-guard/${guardId}/licenses/${licenseId}`);
    return data;
  },

  async downloadSecurityGuardLicenseReport(guardId: string, licenseId: string) {
    const tenantId = getTenantId();
    const response = await api.get(`/tenant/${tenantId}/security-guard/${guardId}/licenses/${licenseId}/download?format=pdf`, {
      responseType: 'blob',
      toast: { silentError: true },
    } as any);
    return response && (response as any).data !== undefined ? (response as any).data : response;
  },

  async updateSecurityGuardLicense(guardId: string, licenseId: string, payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.put<any>(`/tenant/${tenantId}/security-guard/${guardId}/licenses/${licenseId}`, payload);
    return data;
  },

  async destroySecurityGuardLicenses(guardId: string, ids: string[]) {
    const tenantId = getTenantId();
    const { data } = await api.delete<any>(`/tenant/${tenantId}/security-guard/${guardId}/licenses?ids=${ids.join(',')}`);
    return data;
  },

  async uploadGuardLicenseImage(file: File) {
    const tenantId = getTenantId();
    const filename = file.name;
    const creds: any = await api.get(`/tenant/${tenantId}/file/credentials?filename=${encodeURIComponent(filename)}&storageId=securityGuardLicenseImage`);

    const uploadUrl = creds.data?.uploadCredentials?.url ?? creds.uploadCredentials?.url;
    if (!uploadUrl) throw new Error('Upload URL not available');

    const form = new FormData();
    form.append('filename', filename);
    form.append('file', file);

    const uploadResp = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!uploadResp.ok) {
      const text = await uploadResp.text().catch(() => null);
      throw new Error(`Upload failed: ${uploadResp.status} ${text}`);
    }

    const fileObj = {
      new: true,
      name: filename,
      sizeInBytes: file.size,
      privateUrl: creds.data?.privateUrl ?? creds.privateUrl,
      publicUrl: creds.data?.uploadCredentials?.publicUrl ?? creds.uploadCredentials?.publicUrl ?? null,
    };

    return fileObj;
  },
};

export default securityGuardService;
