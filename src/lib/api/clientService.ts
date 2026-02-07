import api, { getAuthToken } from "../api";
import type {
    Client,
    ClientInput,
    ClientFilters,
    PaginationParams,
    ClientListResponse,
} from "@/types/client";

// Variable global para almacenar el tenantId
let globalTenantId: string | null = null;

/**
 * Configura el tenantId globalmente para el servicio.
 * Debe ser llamado al inicio de la aplicación o cuando el usuario se autentica.
 */
export const setTenantId = (id: string) => {
    globalTenantId = id;
    localStorage.setItem("tenantId", id);
};

/**
 * Obtiene el tenantId configurado.
 * Si no está en memoria, intenta recuperarlo de localStorage.
 * Si no existe, lanza un error.
 */
const getTenantId = (): string => {
    if (globalTenantId) return globalTenantId;
    const local = localStorage.getItem("tenantId");
    if (local) {
        globalTenantId = local;
        return local;
    }

    // Fallback: AuthProvider exposes debugging info on window.__APP_AUTH
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
    } catch (e) {
        // ignore
    }

    throw new Error("El usuario debe estar vinculado a una empresa para continuar");
};

export const clientService = {
    /**
     * Get list of clients with filters and pagination
     */
    async getClients(
        filters?: ClientFilters,
        pagination?: PaginationParams
    ): Promise<ClientListResponse> {
        const tenantId = getTenantId();
        const params = new URLSearchParams();

        // Add pagination
        if (pagination) {
            if (pagination.limit) params.append("limit", pagination.limit.toString());
            if (pagination.offset) params.append("offset", pagination.offset.toString());
            if (pagination.orderBy) params.append("orderBy", pagination.orderBy);
        }

        // Add filters
        if (filters) {
            if (filters.name) params.append("filter[name]", filters.name);
            if (filters.lastName) params.append("filter[lastName]", filters.lastName);
            if (filters.email) params.append("filter[email]", filters.email);
            if (filters.phoneNumber) params.append("filter[phoneNumber]", filters.phoneNumber);
            if (filters.address) params.append("filter[address]", filters.address);
            if (filters.city) params.append("filter[city]", filters.city);
            if (filters.country) params.append("filter[country]", filters.country);
            if (filters.faxNumber) params.append("filter[faxNumber]", filters.faxNumber);
            if (filters.website) params.append("filter[website]", filters.website);
            if (filters.category) params.append("filter[categoryIds]", filters.category);
            // Backend espera 1/0 para activo/inactivo
            if (filters.active !== undefined) {
                const activeInt = filters.active ? 1 : 0;
                params.append("filter[active]", String(activeInt));
            }
            if (filters.createdAtRange) {
                params.append("filter[createdAtRange][]", filters.createdAtRange[0]);
                params.append("filter[createdAtRange][]", filters.createdAtRange[1]);
            }
        }

        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account?${params.toString()}`,
            // Prevent global interceptor from showing duplicate toasts; component will show one
            { toast: { silentError: true } } as any
        );
        // Mapear zipCode/addressComplement y normalizar active a boolean
        if (data.rows) {
            data.rows = data.rows.map((client: any) => {
                const normalizedActive = client.active === true || client.active === 1
                    ? true
                    : client.active === false || client.active === 0
                    ? false
                    : true; // fallback activo si falta en lista
                return {
                    ...client,
                    postalCode: client.zipCode || client.postalCode,
                    addressLine2: client.addressComplement || client.addressLine2,
                    active: normalizedActive,
                };
            });
        }
        return data;
    },

    /**
     * Get a single client by ID
     */
    async getClient(id: string): Promise<Client> {
        const tenantId = getTenantId();
            const { data } = await api.get<any>(
                `/tenant/${tenantId}/client-account/${id}`,
                // Prevent global interceptor from showing duplicate toasts; component will show one
                { toast: { silentError: true } } as any
            );
        // Mapear zipCode/addressComplement y normalizar active a boolean
        return {
            ...data,
            postalCode: data.zipCode || data.postalCode,
            addressLine2: data.addressComplement || data.addressLine2,
            active:
                data.active === true || data.active === 1
                    ? true
                    : data.active === false || data.active === 0
                    ? false
                    : true,
        };
    },

    /**
     * Create a new client
     */
    async createClient(input: ClientInput): Promise<Client> {
        const tenantId = getTenantId();
        // Mapear postalCode y addressLine2 del frontend a zipCode y addressComplement del backend
        const payload: any = { ...input };
        if (input.postalCode !== undefined) {
            payload.zipCode = input.postalCode;
            delete payload.postalCode;
        }
        if (input.addressLine2 !== undefined) {
            payload.addressComplement = input.addressLine2;
            delete payload.addressLine2;
        }
        const { data } = await api.post<any>(`/tenant/${tenantId}/client-account`,
            payload
        );
        // Mapear zipCode y addressComplement del backend a postalCode y addressLine2 del frontend en la respuesta
        return {
            ...data,
            postalCode: data.zipCode || data.postalCode,
            addressLine2: data.addressComplement || data.addressLine2,
        };
    },

    /**
     * Update an existing client
     */
    async updateClient(id: string, input: ClientInput): Promise<Client> {
        const tenantId = getTenantId();
        // Mapear postalCode y addressLine2 del frontend a zipCode y addressComplement del backend
        const payload: any = { ...input };
        if (input.postalCode !== undefined) {
            payload.zipCode = input.postalCode;
            delete payload.postalCode;
        }
        if (input.addressLine2 !== undefined) {
            payload.addressComplement = input.addressLine2;
            delete payload.addressLine2;
        }
            // Debug: log tenant, masked token and payload to help diagnose 403 Forbidden
            try {
                const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
                const masked = token ? (token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-4)}` : token) : null;
            } catch (e) {
                // ignore logging errors
            }

            const { data } = await api.put<any>(
                `/tenant/${tenantId}/client-account/${id}`,
                payload
            );
        // Mapear zipCode y addressComplement del backend a postalCode y addressLine2 del frontend en la respuesta
        return {
            ...data,
            postalCode: data.zipCode || data.postalCode,
            addressLine2: data.addressComplement || data.addressLine2,
        };
    },

    /**
     * Delete a single client
     */
    async deleteClient(id: string): Promise<void> {
        const tenantId = getTenantId();
        await api.delete(`/tenant/${tenantId}/client-account/${id}`, { toast: { silentError: true } });
    },

    /**
     * Delete multiple clients
     */
    async deleteClients(ids: string[]): Promise<void> {
        const tenantId = getTenantId();
        await api.post(`/tenant/${tenantId}/client-account/destroy-all`, { ids }, { toast: { silentError: true } });
    },

    /**
     * Export clients to PDF
     */
    async exportPDF(filters?: ClientFilters): Promise<Blob> {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        params.append("format", "pdf");

        // Add filters if provided
        if (filters) {
            if (filters.name) params.append("filter[name]", filters.name);
            if (filters.category) params.append("filter[category]", filters.category);
        }

        const { data } = await api.get(
            `/tenant/${tenantId}/client-account/export?${params.toString()}`,
            {
                responseType: "blob",
            }
        );
        return data;
    },

    /**
     * Export clients to Excel
     */
    async exportExcel(filters?: ClientFilters): Promise<Blob> {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        params.append("format", "excel");

        // Add filters if provided
        if (filters) {
            if (filters.name) params.append("filter[name]", filters.name);
            if (filters.category) params.append("filter[category]", filters.category);
        }

        const { data } = await api.get(
            `/tenant/${tenantId}/client-account/export?${params.toString()}`,
            {
                responseType: "blob",
            }
        );
        return data;
    },

    /**
     * Import clients from Excel file
     */
    async importExcel(file: File): Promise<{ imported: number; errors?: string[] }> {
        const tenantId = getTenantId();
        
        // Generar un hash único para la importación
        const importHash = `import-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("importHash", importHash);

        const { data } = await api.post(
            `/tenant/${tenantId}/client-account/import`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return data;
    },

    /**
     * Get autocomplete suggestions for client names
     */
    async autocomplete(query: string, limit = 10): Promise<Array<{ id: string; label: string }>> {
        const tenantId = getTenantId();
        const { data } = await api.get(
            `/tenant/${tenantId}/client-account/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`
        );
        return data;
    },

    /**
     * Check if a category is in use by any client
     */
    async checkCategoryUsage(categoryId: string): Promise<number> {
        const tenantId = getTenantId();
        
        // Obtener todos los clientes y filtrar manualmente
        // ya que el backend puede no soportar filtrado por array JSON
        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account?limit=9999&offset=0`
        );
        
        
        // Contar manualmente cuántos clientes tienen esta categoría
        let count = 0;
        if (data.rows) {
            count = data.rows.filter((client: any) => {
                const categoryIds = client.categoryIds || [];
                const hasCategory = Array.isArray(categoryIds) && categoryIds.includes(categoryId);
                if (hasCategory) {
                }
                return hasCategory;
            }).length;
        }
        
        return count;
    },

    /**
     * Get post sites for a client (supports pagination)
     */
    async getClientPostSites(clientId: string, pagination: { limit?: number; offset?: number } = { limit: 25, offset: 0 }) {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        if (pagination.limit !== undefined) params.append('limit', String(pagination.limit));
        if (pagination.offset !== undefined) params.append('offset', String(pagination.offset));

        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account/${clientId}/post-sites?${params.toString()}`,
            { toast: { silentError: true } } as any,
        );

        return data;
    },

    /**
     * Client contacts CRUD
     */
    async getClientContacts(clientId: string, pagination: { limit?: number; offset?: number } = { limit: 25, offset: 0 }) {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        if (pagination.limit !== undefined) params.append('limit', String(pagination.limit));
        if (pagination.offset !== undefined) params.append('offset', String(pagination.offset));

        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account/${clientId}/contacts?${params.toString()}`,
            { toast: { silentError: true } } as any,
        );

        return data;
    },

    async createClientContact(clientId: string, payload: any) {
        const tenantId = getTenantId();
        const { data } = await api.post<any>(
            `/tenant/${tenantId}/client-account/${clientId}/contacts`,
            payload,
        );
        // Return full payload from backend so callers can read message and data
        return data;
    },

    async updateClientContact(clientId: string, contactId: string, payload: any) {
        const tenantId = getTenantId();
        const { data } = await api.put<any>(
            `/tenant/${tenantId}/client-account/${clientId}/contacts/${contactId}`,
            payload,
        );
        return data;
    },

    async destroyClientContact(clientId: string, contactId: string) {
        const tenantId = getTenantId();
        const { data } = await api.delete<any>(
            `/tenant/${tenantId}/client-account/${clientId}/contacts/${contactId}`,
        );
        // For delete we return the whole payload so callers can read messages
        return data;
    },

    /**
     * Client notes CRUD
     */
    async getClientNotes(clientId: string, pagination: { limit?: number; offset?: number } = { limit: 25, offset: 0 }) {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        if (pagination.limit !== undefined) params.append('limit', String(pagination.limit));
        if (pagination.offset !== undefined) params.append('offset', String(pagination.offset));

        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account/${clientId}/notes?${params.toString()}`,
            { toast: { silentError: true } } as any,
        );

        return data;
    },

    async createClientNote(clientId: string, payload: any) {
        const tenantId = getTenantId();
        const { data } = await api.post<any>(
            `/tenant/${tenantId}/client-account/${clientId}/notes`,
            payload,
        );
        return data;
    },

    async updateClientNote(clientId: string, noteId: string, payload: any) {
        const tenantId = getTenantId();
        const { data } = await api.put<any>(
            `/tenant/${tenantId}/client-account/${clientId}/notes/${noteId}`,
            payload,
        );
        return data;
    },

    async destroyClientNote(clientId: string, noteId: string) {
        const tenantId = getTenantId();
        const { data } = await api.delete<any>(
            `/tenant/${tenantId}/client-account/${clientId}/notes/${noteId}`,
        );
        return data;
    },

    /**
     * Get guards assigned to a client (uses tenant pivot) - supports pagination
     */
    async getClientGuards(clientId: string, pagination: { limit?: number; offset?: number } = { limit: 25, offset: 0 }) {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        if (pagination.limit !== undefined) params.append('limit', String(pagination.limit));
        if (pagination.offset !== undefined) params.append('offset', String(pagination.offset));

        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account/${clientId}/guards?${params.toString()}`,
            { toast: { silentError: true } } as any,
        );

        return data;
    },

    /**
     * Get only the count of guards assigned to a client (much lighter)
     */
    async getClientGuardsCount(clientId: string): Promise<number> {
        const tenantId = getTenantId();
        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account/${clientId}/guards/count`,
            { toast: { silentError: true } } as any,
        );
        return Number(data?.count || 0);
    },


    /**
     * Get incidents for a client (by station ids) - supports filters and pagination
     */
    async getClientIncidents(clientId: string, options: { limit?: number; offset?: number; filter?: any } = {}) {
        const tenantId = getTenantId();
        const params = new URLSearchParams();
        if (options.limit !== undefined) params.append('limit', String(options.limit));
        if (options.offset !== undefined) params.append('offset', String(options.offset));
        if (options.filter && typeof options.filter === 'object') {
            for (const key of Object.keys(options.filter)) {
                const val = options.filter[key];
                if (Array.isArray(val)) {
                    for (const v of val) params.append(`filter[${key}][]`, String(v));
                } else {
                    params.append(`filter[${key}]`, String(val));
                }
            }
        }

    },
};
