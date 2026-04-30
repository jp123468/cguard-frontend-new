import api from '@/lib/api';
import { PostSiteInput } from '@/lib/validators/post-site';

export interface PostSite {
  id: string;
  name: string;
  clientId: string;
  client?: { id: string; name: string };
  address: string;
  email?: string;
  phone?: string;
  fax?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  // station fields
  latitud?: string | number;
  longitud?: string | number;
  stationSchedule?: string | null;
  startingTimeInDay?: string | null;
  finishTimeInDay?: string | null;
  assignedGuards?: any[];
  guardsCount?: number;
  numberOfGuardsInStation?: string | number | null;
  serviceType?: string;
}

export interface PostSiteFilters {
  name?: string;
  clientId?: string;
  categoryId?: string;
  category?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  status?: 'active' | 'inactive';
  active?: boolean;
  serviceType?: string;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PostSiteListResponse {
  rows: PostSite[];
  count: number;
}

let globalTenantId: string | null = null;
export const setTenantId = (id: string) => {
  globalTenantId = id;
  localStorage.setItem('tenantId', id);
};

const getTenantId = (): string => {
  if (globalTenantId) return globalTenantId;
  const local = localStorage.getItem('tenantId');
  if (local) {
    globalTenantId = local;
    return local;
  }
  try {
    const w: any = window as any;
    const info = w.__APP_AUTH;
    if (info) {
      if (info.tenantId) {
        globalTenantId = info.tenantId;
        try { localStorage.setItem('tenantId', info.tenantId); } catch {}
        return info.tenantId;
      }
      const u = info.user;
      if (u && Array.isArray(u.tenants) && u.tenants.length > 0) {
        const t = u.tenants[0];
        const tid = t.tenantId || (t.tenant && (t.tenant.id || t.tenant.tenantId));
        if (tid) {
          globalTenantId = tid;
          try { localStorage.setItem('tenantId', tid); } catch {}
          return tid;
        }
      }
    }
  } catch (e) {}
  throw new Error('El usuario debe estar vinculado a una empresa para continuar.');
};

const stationService = {
  async list(filters: PostSiteFilters = {}, options: PaginationOptions = { limit: 25, offset: 0 }): Promise<PostSiteListResponse> {
    const tenantId = getTenantId();
    const params = new URLSearchParams();
    if (filters.name) params.append('filter[name]', filters.name);
    if (filters.clientId) params.append('filter[clientId]', filters.clientId);
    // allow filtering stations by postSite id (station repository expects filter.postSite)
    const postSiteId = (filters as any).postSite || (filters as any).postSiteId || undefined;
    if (postSiteId) params.append('filter[postSite]', postSiteId);
    const categoryToUse = filters.categoryId ?? filters.category;
    if (categoryToUse) params.append('filter[categoryIds]', categoryToUse);
    if (filters.email) {
      params.append('filter[email]', filters.email);
      params.append('filter[contactEmail]', filters.email);
    }
    const phoneToUse = (filters as any).phone ?? (filters as any).phoneNumber;
    if (phoneToUse) {
      params.append('filter[phone]', phoneToUse);
      params.append('filter[contactPhone]', phoneToUse);
    }
    if (filters.city) params.append('filter[city]', filters.city);
    if (filters.country) params.append('filter[country]', filters.country);
    if (typeof filters.status === 'string') {
      params.append('filter[active]', filters.status === 'active' ? 'true' : 'false');
    } else if (typeof filters.active === 'boolean') {
      params.append('filter[active]', filters.active.toString());
    }
    params.append('limit', options.limit.toString());
    params.append('offset', options.offset.toString());
    // If caller asked for stations linked to a postSite, call the stations endpoint
    const useStationsEndpoint = !!postSiteId;
    const endpoint = useStationsEndpoint ? 'stations' : 'post-site';
    const { data } = await api.get(`/tenant/${tenantId}/${endpoint}?${params.toString()}`, { toast: { silentError: true } } as any);
    const mappedRows: PostSite[] = (data.rows || []).map((r: any) => ({
      id: r.id,
      name: r.stationName ?? r.name ?? '',
      companyName: r.stationName ?? r.companyName ?? undefined,
      description: r.description ?? undefined,
      client: r.client ?? r.clientAccount ?? undefined,
      clientId: r.clientAccountId ?? r.clientId ?? undefined,
      address: r.address ?? '',
      postalCode: r.postalCode ?? r.zipCode ?? undefined,
      city: r.city ?? undefined,
      country: r.country ?? undefined,
      email: r.contactEmail ?? r.email ?? undefined,
      phone: r.contactPhone ?? r.phone ?? undefined,
      fax: r.fax ?? undefined,
      categoryId: Array.isArray(r.categoryIds) && r.categoryIds.length > 0 ? r.categoryIds[0] : undefined,
      categoryIds: Array.isArray(r.categoryIds) ? r.categoryIds : [],
      status: typeof r.active === 'boolean' ? (r.active ? 'active' : 'inactive') : (r.status ?? 'inactive'),
      latitud: r.latitud ?? r.latitude ?? undefined,
      longitud: r.longitud ?? r.longitude ?? undefined,
      stationSchedule: r.stationSchedule ?? undefined,
      startingTimeInDay: r.startingTimeInDay ?? undefined,
      finishTimeInDay: r.finishTimeInDay ?? undefined,
      assignedGuards: Array.isArray(r.assignedGuards) ? r.assignedGuards : undefined,
      guardsCount: typeof r.guardsCount === 'number' ? r.guardsCount : (Array.isArray(r.assignedGuards) ? r.assignedGuards.length : undefined),
      numberOfGuardsInStation: r.numberOfGuardsInStation ?? undefined,
      serviceType: r.serviceType ?? undefined,
    }));
    return { rows: mappedRows, count: data.count };
  },

  async get(id: string): Promise<any> {
    const tenantId = getTenantId();
    // Use the canonical `/post-site/:id` endpoint directly. Some deployments
    // previously attempted `/stations/:id` first which produced noisy 404s
    // for valid post-site resources; remove that fallback.
    const postSiteUrl = `/tenant/${tenantId}/post-site/${id}`;
    const { data } = await api.get(postSiteUrl, { toast: { silentError: true } } as any);
    return data;
  },

  async create(payload: PostSiteInput): Promise<PostSite> {
    const tenantId = getTenantId();
    const body: any = {
      stationName: (payload as any).name ?? undefined,
      // backend requires companyName for post-site creation
      companyName: (payload as any).companyName ?? (payload as any).name ?? undefined,
      clientAccountId: (payload as any).clientId ?? undefined,
      address: (payload as any).address ?? undefined,
      secondAddress: (payload as any).addressLine2 ?? undefined,
      postalCode: (payload as any).postalCode ?? undefined,
      city: (payload as any).city ?? undefined,
      country: (payload as any).country ?? undefined,
      description: (payload as any).description ?? undefined,
      contactEmail: (payload as any).email ?? undefined,
      contactPhone: (payload as any).phone ?? undefined,
      fax: (payload as any).fax ?? undefined,
      categoryIds: (payload as any).categoryId ? [(payload as any).categoryId] : [],
      active: typeof (payload as any).status === 'string' ? (payload as any).status === 'active' : true,
      latitud: (payload as any).latitud ?? (payload as any).latitude ?? undefined,
      longitud: (payload as any).longitud ?? (payload as any).longitude ?? undefined,
      stationSchedule: (payload as any).stationSchedule ?? undefined,
      startingTimeInDay: (payload as any).startingTimeInDay ?? undefined,
      finishTimeInDay: (payload as any).finishTimeInDay ?? undefined,
      serviceType: (payload as any).serviceType ?? undefined,
      serviceConfig: (payload as any).serviceConfig ?? undefined,
    };
    const { data } = await api.post(`/tenant/${tenantId}/post-site`, body);
    return data;
  },

  async update(id: string, payload: Partial<PostSiteInput>): Promise<PostSite> {
    const tenantId = getTenantId();
    // Load existing resource using stationService.get which already handles
    // legacy `/stations/:id` and `/post-site/:id` patterns. If that fails,
    // attempt a direct `/post-site/:id` GET as a last resort and proceed with
    // an empty fallback object so update still attempts to submit.
    let existing: any = {};
    try {
      existing = await stationService.get(id);
    } catch (err) {
      console.error(`stationService.update: failed to load existing station/post-site ${id}`, err);
      try {
        const res = await api.get(`/tenant/${tenantId}/post-site/${id}`, { toast: { silentError: true } } as any);
        existing = res.data || {};
      } catch (e) {
        console.error(`stationService.update: fallback direct post-site GET also failed for ${id}`, e);
        existing = {};
      }
    }
    const body: any = {
      stationName: (payload as any).name ?? existing.stationName ?? existing.name,
      // include companyName for backend compatibility
      companyName: (payload as any).companyName ?? (payload as any).name ?? existing.companyName ?? existing.stationName ?? existing.name,
      clientAccountId: (payload as any).clientId ?? existing.clientAccountId ?? existing.clientId,
      address: (payload as any).address ?? existing.address,
      secondAddress: (payload as any).addressLine2 ?? existing.secondAddress ?? existing.addressLine2,
      postalCode: (payload as any).postalCode ?? existing.postalCode ?? existing.zipCode,
      city: (payload as any).city ?? existing.city,
      country: (payload as any).country ?? existing.country,
      description: (payload as any).description ?? existing.description,
      contactPhone: (payload as any).phone ?? existing.contactPhone ?? existing.phone,
      fax: (payload as any).fax ?? existing.fax,
      categoryIds: (payload as any).categoryId ? [(payload as any).categoryId] : (existing.categoryIds || []),
      contactEmail: (payload as any).email ?? existing.contactEmail ?? existing.email,
      active: typeof (payload as any).status === 'string' ? (payload as any).status === 'active' : existing.active,
      latitud: (payload as any).latitud ?? (payload as any).latitude ?? existing.latitud ?? existing.latitude,
      longitud: (payload as any).longitud ?? (payload as any).longitude ?? existing.longitud ?? existing.longitude,
      stationSchedule: (payload as any).stationSchedule ?? existing.stationSchedule,
      startingTimeInDay: (payload as any).startingTimeInDay ?? existing.startingTimeInDay,
      finishTimeInDay: (payload as any).finishTimeInDay ?? existing.finishTimeInDay,
      serviceType: (payload as any).serviceType ?? existing.serviceType ?? undefined,
      serviceConfig: (payload as any).serviceConfig ?? existing.serviceConfig ?? undefined,
    };
    const { data } = await api.put(`/tenant/${tenantId}/post-site/${id}`, body);
    return data;
  },

  async delete(ids: string[]): Promise<void> {
    const tenantId = getTenantId();
    await api.delete(`/tenant/${tenantId}/post-site`, { data: { ids } });
  },

  async exportPDF(filters: PostSiteFilters = {}): Promise<Blob> {
    const tenantId = getTenantId();
    const params = new URLSearchParams();
    if (filters.name) params.append('filter[name]', filters.name);
    if (filters.clientId) params.append('filter[clientId]', filters.clientId);
    const categoryToUse = filters.categoryId ?? (filters as any).category;
    if (categoryToUse) params.append('filter[categoryIds]', categoryToUse);
    if (filters.email) {
      params.append('filter[email]', filters.email);
      params.append('filter[contactEmail]', filters.email);
    }
    const phoneToUse = (filters as any).phone ?? (filters as any).phoneNumber;
    if (phoneToUse) {
      params.append('filter[phone]', phoneToUse);
      params.append('filter[contactPhone]', phoneToUse);
    }
    if (typeof filters.status === 'string') params.append('filter[active]', filters.status === 'active' ? 'true' : 'false');
    else if (typeof filters.active === 'boolean') params.append('filter[active]', filters.active.toString());
    params.append('format', 'pdf');
    const { data } = await api.get(`/tenant/${tenantId}/post-site/export?${params.toString()}`, { responseType: 'blob' });
    return data;
  },

  async exportExcel(filters: PostSiteFilters = {}): Promise<Blob> {
    const tenantId = getTenantId();
    const params = new URLSearchParams();
    if (filters.name) params.append('filter[name]', filters.name);
    if (filters.clientId) params.append('filter[clientId]', filters.clientId);
    const categoryToUse = filters.categoryId ?? (filters as any).category;
    if (categoryToUse) params.append('filter[categoryIds]', categoryToUse);
    if (filters.email) {
      params.append('filter[email]', filters.email);
      params.append('filter[contactEmail]', filters.email);
    }
    const phoneToUse = (filters as any).phone ?? (filters as any).phoneNumber;
    if (phoneToUse) {
      params.append('filter[phone]', phoneToUse);
      params.append('filter[contactPhone]', phoneToUse);
    }
    if (typeof filters.status === 'string') params.append('filter[active]', filters.status === 'active' ? 'true' : 'false');
    else if (typeof filters.active === 'boolean') params.append('filter[active]', filters.active.toString());
    params.append('format', 'excel');
    const { data } = await api.get(`/tenant/${tenantId}/post-site/export?${params.toString()}`, { responseType: 'blob' });
    return data;
  },

  async import(file: File): Promise<{ success: number; failed: number; errors: any[] }> {
    const tenantId = getTenantId();
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/tenant/${tenantId}/post-site/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } } as any);
    return data;
  },
};

export { stationService };
