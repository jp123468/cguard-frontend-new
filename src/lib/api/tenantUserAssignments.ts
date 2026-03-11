import api from '@/lib/api';

export const tenantUserClientAccountsApi = {
  async list() {
    const { data } = await api.get('/api/tenant-user-client-accounts');
    return data;
  },
  async create(payload: any) {
    const { data } = await api.post('/api/tenant-user-client-accounts', payload);
    return data;
  },
  async remove(id: string | number) {
    const { data } = await api.delete(`/api/tenant-user-client-accounts/${id}`);
    return data;
  },
};

export const tenantUserPostSiteApi = {
  async list() {
    const { data } = await api.get('/api/tenant-user-postsite');
    return data;
  },
  async create(payload: any) {
    const { data } = await api.post('/api/tenant-user-postsite', payload);
    return data;
  },
  async remove(id: string | number) {
    const { data } = await api.delete(`/api/tenant-user-postsite/${id}`);
    return data;
  },
};
