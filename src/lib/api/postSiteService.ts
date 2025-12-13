import axios from 'axios';
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
}

export interface PostSiteFilters {
  name?: string;
  clientId?: string;
  categoryId?: string;
  status?: 'active' | 'inactive';
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PostSiteListResponse {
  rows: PostSite[];
  count: number;
}

const API_BASE = '/api/post-sites';

const postSiteService = {
  /**
   * Get paginated list of post sites
   */
  async list(
    filters: PostSiteFilters = {},
    options: PaginationOptions = { limit: 25, offset: 0 }
  ): Promise<PostSiteListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.name) params.append('filter[name]', filters.name);
      if (filters.clientId) params.append('filter[clientId]', filters.clientId);
      if (filters.categoryId) params.append('filter[categoryId]', filters.categoryId);
      if (filters.status) params.append('filter[status]', filters.status);
      
      params.append('limit', options.limit.toString());
      params.append('offset', options.offset.toString());

      const { data } = await axios.get(`${API_BASE}?${params.toString()}`);
      return data;
    } catch (error) {
      console.error('Error fetching post sites:', error);
      throw error;
    }
  },

  /**
   * Get a single post site by ID
   */
  async get(id: string): Promise<PostSite> {
    try {
      const { data } = await axios.get(`${API_BASE}/${id}`);
      return data;
    } catch (error) {
      console.error('Error fetching post site:', error);
      throw error;
    }
  },

  /**
   * Create a new post site
   */
  async create(payload: PostSiteInput): Promise<PostSite> {
    try {
      const { data } = await axios.post(API_BASE, payload);
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
      const { data } = await axios.put(`${API_BASE}/${id}`, payload);
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
      await axios.delete(API_BASE, {
        data: { ids },
      });
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
      const params = new URLSearchParams();
      
      if (filters.name) params.append('filter[name]', filters.name);
      if (filters.clientId) params.append('filter[clientId]', filters.clientId);
      if (filters.categoryId) params.append('filter[categoryId]', filters.categoryId);
      if (filters.status) params.append('filter[status]', filters.status);

      const { data } = await axios.get(`${API_BASE}/export?${params.toString()}&format=pdf`, {
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
      const params = new URLSearchParams();
      
      if (filters.name) params.append('filter[name]', filters.name);
      if (filters.clientId) params.append('filter[clientId]', filters.clientId);
      if (filters.categoryId) params.append('filter[categoryId]', filters.categoryId);
      if (filters.status) params.append('filter[status]', filters.status);

      const { data } = await axios.get(`${API_BASE}/export?${params.toString()}&format=excel`, {
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
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axios.post(`${API_BASE}/import`, formData, {
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
      const { data } = await axios.get(`${API_BASE}/autocomplete`, {
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
