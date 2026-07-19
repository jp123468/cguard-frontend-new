import api from '@/lib/api';

const getTenantId = (): string => {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant ID no configurado');
  return t;
};

const inventoryService = {
  async createHistory(payload: Record<string, unknown>) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/inventory-history`, { data: payload });
    return data;
  },
};

export default inventoryService;
