import { toast } from "sonner";
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class ApiService {
  static async request(endpoint: string, options: any = {}) {
    const token = localStorage.getItem("authToken");

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const isFormData = options.body instanceof FormData;
    if (isFormData) delete headers["Content-Type"];

    if (token && !options.skipAuth) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Si tu backend es multi-tenant y exige header, descomenta:
    // const tenantId = localStorage.getItem("tenantId");
    // if (tenantId) headers["X-Tenant-Id"] = tenantId;

    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    try {
      try {
        const tokenMask = token ? `${String(token).slice(0, 6)}...${String(token).slice(-4)}` : null;
      } catch {}
    } catch {}

    let response: Response;
    try {
      // Ensure credentials (cookies) are sent so backend session auth works
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    } catch {
      throw new ApiError("No se pudo conectar con el servidor.", 0, null);
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let data: any = null;
    try {
      if (response.status === 204) data = null;
      else if (isJson) {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } else {
        data = await response.text().catch(() => null);
      }
    } catch {
      data = null;
    }

    if (!response.ok) {
      // Build a concise message. If the response is non-JSON and looks like an HTML error page,
      // avoid including the full HTML body in logs and thrown errors.
      let msgRaw = (data && (data.message || data.error || data.detail)) || (typeof data === "string" && data) || `Error: ${response.status} ${response.statusText}`;

      let msg = msgRaw;
      let fullResponse = data;
      if (typeof data === "string" && /<\s*!?doctype|<html/i.test(data)) {
        msg = `Error: ${response.status} ${response.statusText}`;
        fullResponse = null; // avoid logging large HTML blobs
      }
      // Lanzar ApiError para que la UI decida mostrar toast
      throw new ApiError(msg, response.status, fullResponse);
    }


    return data;
  }

  static get(endpoint: string, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }
  static post(endpoint: string, body?: any, options = {}) {
    const payload = body instanceof FormData ? body : JSON.stringify(body ?? {});
    return this.request(endpoint, { ...options, method: "POST", body: payload }); 
  }
  static put(endpoint: string, body?: any, options = {}) {
    const payload = body instanceof FormData ? body : JSON.stringify(body ?? {});
    return this.request(endpoint, { ...options, method: "PUT", body: payload });
  }
  static delete(endpoint: string, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  static async getBlob(endpoint: string, options: any = {}) {
    const token = localStorage.getItem("authToken");

    const headers: Record<string, string> = {
      ...(options.headers || {}),
    };

    if (token && !options.skipAuth) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, { ...options, method: 'GET', headers, credentials: 'include' });
    } catch {
      throw new ApiError("No se pudo conectar con el servidor.", 0, null);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => null);
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      let msg = (data && (data.message || data.error)) || `Error: ${response.status} ${response.statusText}`;
      if (typeof text === 'string' && /<\s*!?doctype|<html/i.test(text)) {
        msg = `Error: ${response.status} ${response.statusText}`;
      }
      throw new ApiError(msg, response.status, data);
    }

    const blob = await response.blob();
    return blob;
  }
}
