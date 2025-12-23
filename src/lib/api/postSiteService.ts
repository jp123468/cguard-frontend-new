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
  // Extended backend fields
  companyName?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  categoryIds?: string[] | null;
}

export interface PostSiteFilters {
  name?: string;
  clientId?: string;
  // support both category and categoryId names used across the UI
  categoryId?: string;
  category?: string;
  email?: string;
  // some pages use `phoneNumber`, others `phone`
  phone?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  // support both `status` (string) and `active` (boolean) used in different pages
  status?: 'active' | 'inactive';
  active?: boolean;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PostSiteListResponse {
  rows: PostSite[];
  count: number;
}

// Variable global para almacenar el tenantId
let globalTenantId: string | null = null;

export const setTenantId = (id: string) => {
  globalTenantId = id;
  localStorage.setItem("tenantId", id);
};

const getTenantId = (): string => {
  if (globalTenantId) return globalTenantId;
  const local = localStorage.getItem("tenantId");
  if (local) {
    globalTenantId = local;
    return local;
  }
  throw new Error("Tenant ID no configurado. Asegúrese de que el usuario ha iniciado sesión correctamente.");
};

const postSiteService = {
  /**
   * Get paginated list of post sites
   */
  async list(
    filters: PostSiteFilters = {},
    options: PaginationOptions = { limit: 25, offset: 0 }
  ): Promise<PostSiteListResponse> {
    try {
      const tenantId = getTenantId();
      const params = new URLSearchParams();
      
      if (filters.name) params.append('filter[name]', filters.name);
      if (filters.clientId) params.append('filter[clientId]', filters.clientId);

      // category may be provided as `category` or `categoryId`
      const categoryToUse = filters.categoryId ?? filters.category;
      if (categoryToUse) {
        // Only send `categoryIds` to avoid ambiguous column errors
        params.append('filter[categoryIds]', categoryToUse);
      }

      // email / phone filters - include common backend field variants
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

      // status can be provided as a string `status` or boolean `active`.
      // Normalize to `filter[active]=true|false` which the backend accepts.
      if (typeof filters.status === 'string') {
        params.append('filter[active]', filters.status === 'active' ? 'true' : 'false');
      } else if (typeof filters.active === 'boolean') {
        params.append('filter[active]', filters.active.toString());
      }
      
      params.append('limit', options.limit.toString());
      params.append('offset', options.offset.toString());

      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.debug('[postSiteService] list params ->', params.toString());
      }
      const { data } = await api.get(`/tenant/${tenantId}/business-info?${params.toString()}`);

      // Map backend `business-info` shape to frontend `PostSite` shape
      const mappedRows: PostSite[] = (data.rows || []).map((r: any) => ({
        id: r.id,
        name: r.companyName ?? r.name ?? "",
        companyName: r.companyName,
        description: r.description,

        client: r.client ?? r.clientAccount ?? undefined,
        clientAccount: r.clientAccount ?? r.client ?? undefined,
        clientAccountName: r.clientAccountName ?? undefined,
        address: r.address ?? "",
        secondAddress: r.secondAddress ?? r.addressLine2 ?? "",
        postalCode: r.postalCode ?? r.zipCode ?? undefined,
        city: r.city ?? undefined,
        country: r.country ?? undefined,
        email: r.contactEmail ?? r.email ?? undefined,
        contactEmail: r.contactEmail ?? r.email ?? undefined,
        phone: r.contactPhone ?? r.phone ?? undefined,
        contactPhone: r.contactPhone ?? r.phone ?? undefined,
        fax: r.fax ?? undefined,
        categoryId: Array.isArray(r.categoryIds) && r.categoryIds.length > 0 ? r.categoryIds[0] : undefined,
        category: undefined,
        categoryIds: Array.isArray(r.categoryIds) ? r.categoryIds : [],
        status: typeof r.active === 'boolean' ? (r.active ? 'active' : 'inactive') : (r.status ?? 'inactive'),
      }));

      return { rows: mappedRows, count: data.count };
    } catch (error) {
      console.error('Error fetching post sites:', error);
      throw error;
    }
  },

  /**
   * Get a single post site by ID
   */
  async get(id: string): Promise<any> {
    try {
      const tenantId = getTenantId();
      const { data } = await api.get(`/tenant/${tenantId}/business-info/${id}`, {
        // Prevent global interceptor from showing duplicate toasts for not-found errors.
        toast: { silentError: true },
      } as any);
      // Return raw backend object so callers can access fields like companyName, categoryIds, latitud, longitud, etc.
      console.debug('Fetched post site:', data);
      return data;
    } catch (error) {
      console.error('Error fetching post site:', error);
      throw error;
    }
  },

  async create(payload: PostSiteInput): Promise<PostSite> {
    try {
      const tenantId = getTenantId();
      const body = {
        companyName: (payload as any).name ?? undefined,
        clientId: (payload as any).clientId ?? undefined,
        address: (payload as any).address ?? undefined,
        secondAddress: (payload as any).addressLine2 ?? undefined,
        postalCode: (payload as any).postalCode ?? undefined,
        city: (payload as any).city ?? undefined,
        country: (payload as any).country ?? undefined,
        description: (payload as any).description ?? undefined,
        email: (payload as any).email ?? undefined,
        contactPhone: (payload as any).phone ?? undefined,
        fax: (payload as any).fax ?? undefined,
        categoryIds: (payload as any).categoryId ? [(payload as any).categoryId] : [],
        contactEmail: (payload as any).email ?? undefined,
        // Ensure new records default to active = true when status not provided
        active: typeof (payload as any).status === 'string'
          ? (payload as any).status === 'active'
          : true,
        latitud: (payload as any).latitud ?? (payload as any).latitude ?? undefined,
        longitud: (payload as any).longitud ?? (payload as any).longitude ?? undefined,
      } as any;

      // Debug log to inspect payload sent to backend (helps diagnose 400s for missing fields)
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.debug('[postSiteService] create body ->', body);
      }

      const { data } = await api.post(`/tenant/${tenantId}/business-info`, body);
      return data;
    } catch (error) {
      console.error('Error creating post site:', error);
      throw error;
    }
  },

  /**
   * Update an existing post site
   */
  async update(id: string, payload: Partial<PostSiteInput>): Promise<PostSite> {
    try {
      const tenantId = getTenantId();
      // Fetch existing record so we can preserve backend-expected fields
      const existingRes = await api.get(`/tenant/${tenantId}/business-info/${id}`);
      const existing = existingRes.data || {};

      const body = {
        // preserve or override
        companyName: (payload as any).name ?? existing.companyName ?? existing.name,
        // backend expects clientAccountId in some endpoints
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
        // For updates, only change active when status provided
        active: typeof (payload as any).status === 'string'
          ? (payload as any).status === 'active'
          : existing.active,
        latitud: (payload as any).latitud ?? (payload as any).latitude ?? existing.latitud ?? existing.latitude,
        longitud: (payload as any).longitud ?? (payload as any).longitude ?? existing.longitud ?? existing.longitude,
      } as any;

      const { data } = await api.put(`/tenant/${tenantId}/business-info/${id}`, body);
      return data;
    } catch (error) {
      console.error('Error updating post site:', error);
      throw error;
    }
  },

  /**
   * Delete one or multiple post sites
   */
  async delete(ids: string[]): Promise<void> {
    try {
      const tenantId = getTenantId();
      await api.delete(`/tenant/${tenantId}/business-info`, { data: { ids } });
    } catch (error) {
      console.error('Error deleting post sites:', error);
      throw error;
    }
  },

  /**
   * Export post sites as PDF
   */
  async exportPDF(filters: PostSiteFilters = {}): Promise<Blob> {
    try {
      const tenantId = getTenantId();
      const params = new URLSearchParams();
      
      if (filters.name) params.append('filter[name]', filters.name);
      if (filters.clientId) params.append('filter[clientId]', filters.clientId);
      const categoryToUse = filters.categoryId ?? (filters as any).category;
      if (categoryToUse) {
        params.append('filter[categoryIds]', categoryToUse);
      }
      if (filters.email) {
        params.append('filter[email]', filters.email);
        params.append('filter[contactEmail]', filters.email);
      }
      const phoneToUse = (filters as any).phone ?? (filters as any).phoneNumber;
      if (phoneToUse) {
        params.append('filter[phone]', phoneToUse);
        params.append('filter[contactPhone]', phoneToUse);
      }
      if (typeof filters.status === 'string') {
        params.append('filter[active]', filters.status === 'active' ? 'true' : 'false');
      } else if (typeof filters.active === 'boolean') {
        params.append('filter[active]', filters.active.toString());
      }
      params.append('format', 'pdf');

      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.debug('[postSiteService] exportPDF params ->', params.toString());
      }
      const { data } = await api.get(`/tenant/${tenantId}/business-info/export?${params.toString()}`, {
        responseType: 'blob',
      });
      return data;
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  },

  /**
   * Export post sites as Excel
   */
  async exportExcel(filters: PostSiteFilters = {}): Promise<Blob> {
    try {
      const tenantId = getTenantId();
      const params = new URLSearchParams();
      
      if (filters.name) params.append('filter[name]', filters.name);
      if (filters.clientId) params.append('filter[clientId]', filters.clientId);
      const categoryExcel = filters.categoryId ?? (filters as any).category;
      if (categoryExcel) {
        params.append('filter[categoryIds]', categoryExcel);
      }
      if (filters.email) {
        params.append('filter[email]', filters.email);
        params.append('filter[contactEmail]', filters.email);
      }
      const phoneExcel = (filters as any).phone ?? (filters as any).phoneNumber;
      if (phoneExcel) {
        params.append('filter[phone]', phoneExcel);
        params.append('filter[contactPhone]', phoneExcel);
      }
      if (typeof filters.status === 'string') {
        params.append('filter[active]', filters.status === 'active' ? 'true' : 'false');
      } else if (typeof filters.active === 'boolean') {
        params.append('filter[active]', filters.active.toString());
      }
      params.append('format', 'excel');

      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.debug('[postSiteService] exportExcel params ->', params.toString());
      }
      const { data } = await api.get(`/tenant/${tenantId}/business-info/export?${params.toString()}`, {
        responseType: 'blob',
      });
      return data;
    } catch (error) {
      console.error('Error exporting Excel:', error);
      throw error;
    }
  },

  /**
   * Import post sites from CSV/Excel
   */
  async import(file: File): Promise<{ success: number; failed: number; errors: any[] }> {
    try {
      const tenantId = getTenantId();
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post(`/tenant/${tenantId}/business-info/import-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (error) {
      console.error('Error importing post sites:', error);
      throw error;
    }
  },

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query: string): Promise<PostSite[]> {
    try {
      const tenantId = getTenantId();
      const { data } = await api.get(`/tenant/${tenantId}/business-info/autocomplete`, {
        params: { query },
      });
      return data;
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      throw error;
    }
  },
};

export { postSiteService };
