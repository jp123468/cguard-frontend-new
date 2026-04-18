import api from '@/lib/api';

const getTenantId = (): string => {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant ID no configurado');
  return t;
};

const routeService = {
  async list(params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    const { data: resp } = await api.get<any>(`/tenant/${tenantId}/route${qs}`);
    if (!resp) return { rows: [], count: 0 };
    if (Array.isArray(resp)) return { rows: resp, count: resp.length };
    if (resp.rows && Array.isArray(resp.rows)) return resp;
    if (resp.data && Array.isArray(resp.data)) return { rows: resp.data, count: resp.data.length };
    return { rows: [], count: 0 };
  },

  async autocomplete(query: string, limit = 10) {
    const tenantId = getTenantId();
    const { data: resp } = await api.get<any>(`/tenant/${tenantId}/route/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);
    return resp || [];
  },

  async find(id: string) {
    const tenantId = getTenantId();
    const { data: resp } = await api.get<any>(`/tenant/${tenantId}/route/${id}`);
    return resp;
  },

  async create(data: Record<string, any>) {
    const tenantId = getTenantId();
    const payload = { ...data, tenantId };
    const { data: resp } = await api.post<any>(`/tenant/${tenantId}/route`, { data: payload });
    return resp;
  },

  async update(id: string, data: Record<string, any>) {
    const tenantId = getTenantId();
    const payload = { ...data, tenantId };
    const { data: resp } = await api.put<any>(`/tenant/${tenantId}/route/${id}`, { data: payload });
    return resp;
  },

  async destroy(ids: string[] | string) {
    const tenantId = getTenantId();
    const payload = Array.isArray(ids) ? ids : [ids];
    await api.delete(`/tenant/${tenantId}/route`, { data: { ids: payload } } as any);
    return true;
  },
};

export default routeService;
