// Client types matching backend structure

export interface Client {
    company: any;
    fullName: any;
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
    active?: boolean;
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
    active?: boolean;
    categoryId?: string;
    // Optional geographic coordinates (string or number accepted)
    latitude?: string | number | null;
    longitude?: string | number | null;
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
    active?: boolean;
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
