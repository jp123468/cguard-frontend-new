import api from '@/lib/api';

const getTenantId = (): string => {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant ID no configurado');
  return t;
};

const patrolLogService = {
  async create(data: Record<string, unknown>) {
    const tenantId = getTenantId();
    const payload = { ...data, tenantId };
    const { data: resp } = await api.post<any>(`/tenant/${tenantId}/patrolLog`, { data: payload });
    return resp;
  },
};

export default patrolLogService;
