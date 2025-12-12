// Client types matching backend structure

export interface Client {
    id: string;
    name: string;
    lastName?: string;
    email: string;
    phoneNumber: string;
    address: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    faxNumber?: string;
    website?: string;
    categoryId?: string;
    category?: {
        id: string;
        name: string;
    };
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface ClientInput {
    name: string;
    lastName?: string;
    email: string;
    phoneNumber: string;
    address: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    faxNumber?: string;
    website?: string;
    categoryId?: string;
}

export interface ClientFilters {
    name?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    country?: string;
    faxNumber?: string;
    website?: string;
    category?: string;
    createdAtRange?: [string, string];
}

export interface PaginationParams {
    limit: number;
    offset: number;
    orderBy?: string;
}

export interface ClientListResponse {
    rows: Client[];
    count: number;
}

export interface Category {
    id: string;
    name: string;
}
