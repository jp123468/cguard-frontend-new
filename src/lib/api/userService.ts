import api from "@/lib/api";
import type { UserCreateData, UserUpdateData, UserCurrent } from "@/types/api";

const getTenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

export const userService = {
  async createUser(data: UserCreateData) {
    const tenantId = getTenantId();
    const url = `/tenant/${tenantId}/user`;
    try { console.log('[userService] createUser ->', { url, payload: data }); } catch (e) {}
    try {
      const { data: resp } = await api.post<any>(url, data);
      try { console.log('[userService] createUser response ->', resp); } catch (e) {}
      return resp;
    } catch (err: any) {
      try { console.error('[userService] createUser ERROR', { url, payload: data, status: err?.response?.status, responseData: err?.response?.data, message: err?.message }); } catch (e) {}
      throw err;
    }
  },

  async updateUser(id: string, data: Partial<UserUpdateData>) {
    const tenantId = getTenantId();
    const url = `/tenant/${tenantId}/user/${id}`;
    try {
      console.log('[userService] updateUser ->', { url, id, payload: data });
    } catch (e) {}

    try {
      const { data: resp } = await api.put<any>(url, data);
      try { console.log('[userService] updateUser response ->', resp); } catch (e) {}
      return resp;
    } catch (err: any) {
      try {
        console.error('[userService] updateUser ERROR', {
          url,
          id,
          payload: data,
          status: err?.response?.status,
          responseData: err?.response?.data,
          message: err?.message,
        });
      } catch (e) {}
      throw err;
    }
  },

  async fetchUser(id: string): Promise<UserCurrent | null> {
    const tenantId = getTenantId();
    const url = `/tenant/${tenantId}/user/${id}`;
    try { console.log('[userService] fetchUser ->', { url, id }); } catch (e) {}
    try {
      const { data: resp } = await api.get<any>(url, { toast: { silentError: true } } as any);
      try { console.log('[userService] fetchUser response ->', resp); } catch (e) {}
      return resp?.data || resp || null;
    } catch (err: any) {
      try { console.error('[userService] fetchUser ERROR', { url, id, status: err?.response?.status, responseData: err?.response?.data, message: err?.message }); } catch (e) {}
      throw err;
    }
  },

  async fetchCurrentUser(): Promise<UserCurrent | null> {
    const { data: resp } = await api.get<any>(`/auth/me`, { toast: { silentError: true } } as any);
    return resp?.data || resp || null;
  }
  ,
  async listUsers(): Promise<any[]> {
    const tenantId = getTenantId();
    const { data: resp } = await api.get<any>(`/tenant/${tenantId}/user`, { toast: { silentError: true } } as any);
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (resp.rows && Array.isArray(resp.rows)) return resp.rows;
    if (resp.data && Array.isArray(resp.data)) return resp.data;
    return [];
  },

  async suspendUser(id: string): Promise<void> {
    const tenantId = getTenantId();
    await api.post(`/tenant/${tenantId}/user/${id}/suspend`);
  },

  async suspendUsers(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const tenantId = getTenantId();
    await api.post(`/tenant/${tenantId}/user/suspend`, { ids });
  },

  async deleteUser(id: string): Promise<void> {
    const tenantId = getTenantId();
    // try delete with JSON body first
    try {
      await api.delete(`/tenant/${tenantId}/user`, { body: JSON.stringify({ ids: [id] }) } as any);
      return;
    } catch (e) {
      // fallbacks
    }
    try {
      await api.post(`/tenant/${tenantId}/user/delete`, { ids: [id] });
      return;
    } catch (e) {
      // continue
    }
    await api.post(`/tenant/${tenantId}/user/remove`, { ids: [id] });
  },

  async resendInvitation(id: string): Promise<void> {
    const tenantId = getTenantId();
    await api.post(`/tenant/${tenantId}/user/${id}/resend-invitation`);
  },

  async restoreUser(id: string): Promise<void> {
    const tenantId = getTenantId();
    await api.post(`/tenant/${tenantId}/user/${id}/restore`);
  }

  ,

  async restoreUsers(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const tenantId = getTenantId();
    await api.post(`/tenant/${tenantId}/user/restore`, { ids });
  }

  ,

  async exportFile(format: "excel" | "pdf" | "csv", params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params as any).toString()}&format=${format}` : `?format=${format}`;
    const response = await api.get(`/tenant/${tenantId}/user/export${qs}`, {
      responseType: "blob",
      toast: { silentError: true },
    } as any);
    return response.data;
  }
};

export default userService;
