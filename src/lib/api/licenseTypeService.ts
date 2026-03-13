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

  async create(input: { name: string }) {
    const tenantId = getTenantId();
    const { data } = await api.post<any>(`/tenant/${tenantId}/license-type`, input);
    return data;
  },

  async autocomplete(query: string, limit = 10) {
    const tenantId = getTenantId();
    const { data } = await api.get<any>(`/tenant/${tenantId}/license-type/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);
    return data;
  },
};

export default licenseTypeService;
