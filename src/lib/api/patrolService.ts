import api from '@/lib/api';

const getTenantId = (): string => {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant ID no configurado');
  return t;
};

const patrolService = {
  async create(payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/patrol`, { data: payload });
    return data;
  },
  async find(id: string) {
    const tenantId = getTenantId();
    const { data } = await api.get(`/tenant/${tenantId}/patrol/${id}`);
    return data;
  },
};

export default patrolService;
