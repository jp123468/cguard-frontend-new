import api from '../api';

const getTenantId = (): string => {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant ID no configurado');
  return t;
};

const licenseTypeService = {
  async list(params: Record<string, any> = {}) {
    const tenantId = getTenantId();
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    const { data } = await api.get<any>(`/tenant/${tenantId}/license-type${qs}`);
    return data;
  },

  async create(input: { name: string; status?: string }) {
    const tenantId = getTenantId();
    const { data } = await api.post<any>(`/tenant/${tenantId}/license-type`, input);
    return data;
  },

  async update(id: string, input: { name?: string; status?: string }) {
    const tenantId = getTenantId();
    const { data } = await api.put<any>(`/tenant/${tenantId}/license-type/${id}`, input);
    return data;
  },

  async destroy(ids: string[]) {
    const tenantId = getTenantId();
    const { data } = await api.delete<any>(`/tenant/${tenantId}/license-type`, { data: { ids } });
    return data;
  },

  async autocomplete(query: string, limit = 10) {
    const tenantId = getTenantId();
    const { data } = await api.get<any>(`/tenant/${tenantId}/license-type/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);
    return data;
  },
};

export default licenseTypeService;
