import api from "../api";
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

    throw new Error("Tenant ID no configurado. Asegúrese de que el usuario ha iniciado sesión correctamente.");
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
            if (filters.category) params.append("filter[category]", filters.category);
            if (filters.createdAtRange) {
                params.append("filter[createdAtRange][]", filters.createdAtRange[0]);
                params.append("filter[createdAtRange][]", filters.createdAtRange[1]);
            }
        }

        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account?${params.toString()}`
        );
        // Mapear zipCode y addressComplement del backend a postalCode y addressLine2 del frontend
        if (data.rows) {
            data.rows = data.rows.map((client: any) => ({
                ...client,
                postalCode: client.zipCode || client.postalCode,
                addressLine2: client.addressComplement || client.addressLine2,
            }));
        }
        return data;
    },

    /**
     * Get a single client by ID
     */
    async getClient(id: string): Promise<Client> {
        const tenantId = getTenantId();
        const { data } = await api.get<any>(
            `/tenant/${tenantId}/client-account/${id}`
        );
        console.log("Respuesta getClient del backend:", data);
        console.log("Campos de dirección:", {
            address2: data.address2,
            addressLine2: data.addressLine2,
            zipCode: data.zipCode,
            postalCode: data.postalCode
        });
        // Mapear zipCode y addressComplement del backend a postalCode y addressLine2 del frontend
        return {
            ...data,
            postalCode: data.zipCode || data.postalCode,
            addressLine2: data.addressComplement || data.addressLine2,
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
        await api.delete(`/tenant/${tenantId}/client-account/${id}`);
    },

    /**
     * Delete multiple clients
     */
    async deleteClients(ids: string[]): Promise<void> {
        const tenantId = getTenantId();
        await api.post(`/tenant/${tenantId}/client-account/destroy-all`, { ids });
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
};
