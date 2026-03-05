import api from '@/lib/api';

const getTenantId = (): string => {
  const t = localStorage.getItem('tenantId');
  if (!t) throw new Error('Tenant ID no configurado');
  return t;
};

export interface VisitorLogFilters {
  id?: string;
  idNumber?: string;
  lastName?: string;
  firstName?: string;
  visitDateRange?: [string | undefined | null, string | undefined | null];
  exitTimeRange?: [string | undefined | null, string | undefined | null];
  clientId?: string;
  postSiteId?: string;
  guardId?: string;
  tag?: string;
  archived?: boolean;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export const visitorLogService = {
  async list(filters: VisitorLogFilters = {}, options: PaginationOptions = { limit: 25, offset: 0 }) {
    const tenantId = getTenantId();
    const params = new URLSearchParams();

    if (filters.id) params.append('filter[id]', filters.id);
    if (filters.idNumber) params.append('filter[idNumber]', filters.idNumber);
    if (filters.lastName) params.append('filter[lastName]', filters.lastName);
    if (filters.firstName) params.append('filter[firstName]', filters.firstName);
    if ((filters as any).query) params.append('filter[query]', (filters as any).query);

    if ((filters as any).clientId) params.append('filter[clientId]', (filters as any).clientId);
    if ((filters as any).postSiteId) params.append('filter[postSiteId]', (filters as any).postSiteId);
    if ((filters as any).guardId) params.append('filter[guardId]', (filters as any).guardId);
    if ((filters as any).tag) params.append('filter[tag]', (filters as any).tag);
    if (typeof (filters as any).archived === 'boolean') params.append('filter[archived]', (filters as any).archived ? 'true' : 'false');

    if (filters.visitDateRange) {
      const [start, end] = filters.visitDateRange;
      if (start) params.append('filter[visitDateRange][]', start);
      if (end) params.append('filter[visitDateRange][]', end);
    }

    if (filters.exitTimeRange) {
      const [start, end] = filters.exitTimeRange;
      if (start) params.append('filter[exitTimeRange][]', start);
      if (end) params.append('filter[exitTimeRange][]', end);
    }

    params.append('limit', String(options.limit));
    params.append('offset', String(options.offset));

    const { data } = await api.get(`/tenant/${tenantId}/visitor-log?${params.toString()}`, { toast: { silentError: true } } as any);
    return data;
  },

  async autocomplete(query = '', limit = 10) {
    const tenantId = getTenantId();
    const qs = new URLSearchParams();
    if (query) qs.append('query', query);
    if (limit) qs.append('limit', String(limit));
    const { data } = await api.get(`/tenant/${tenantId}/visitor-log/autocomplete?${qs.toString()}`, { toast: { silentError: true } } as any);
    return data;
  },

  async get(id: string) {
    const tenantId = getTenantId();
    const { data } = await api.get(`/tenant/${tenantId}/visitor-log/${id}`, { toast: { silentError: true } } as any);
    return data;
  },

  async create(payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.post(`/tenant/${tenantId}/visitor-log`, { data: payload });
    return data;
  },

  async update(id: string, payload: any) {
    const tenantId = getTenantId();
    const { data } = await api.put(`/tenant/${tenantId}/visitor-log/${id}`, { data: payload });
    return data;
  },

  async delete(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const tenantId = getTenantId();
    // Try JSON body delete first
    try {
      await api.delete(`/tenant/${tenantId}/visitor-log`, { data: { ids } } as any);
      return;
    } catch (e) {
      // fallback endpoints
    }
    await api.post(`/tenant/${tenantId}/visitor-log/delete`, { ids });
  },

  async import(data: any, importHash?: string) {
    const tenantId = getTenantId();
    const body: any = { data };
    if (importHash) body.importHash = importHash;
    const { data: resp } = await api.post(`/tenant/${tenantId}/visitor-log/import`, body);
    return resp;
  },
};

export default visitorLogService;
