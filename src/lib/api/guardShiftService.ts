import api from "../api";

const getTenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

const buildQuery = (params?: Record<string, any>) => {
  if (!params) return "";
  const p = new URLSearchParams();
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (Array.isArray(v)) {
      // append as key[] for backend to parse ranges, but skip null/undefined/empty
      for (const item of v) {
        if (item === undefined || item === null) continue;
        const s = String(item);
        if (s.trim() === '') continue;
        p.append(`${k}[]`, s);
      }
    } else if (v !== undefined && v !== null) {
      const s = String(v);
      if (s.trim() !== '') p.append(k, s);
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

const guardShiftService = {
  async list(params?: Record<string, any>) {
    const tenantId = getTenantId();
    const qs = buildQuery(params);
    const resp = await api.get(`/tenant/${tenantId}/guard-shift${qs}`);
    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },

  async find(id: string) {
    const tenantId = getTenantId();
    const resp = await api.get(`/tenant/${tenantId}/guard-shift/${id}`);
    return resp && (resp as any).data !== undefined ? (resp as any).data : resp;
  },
};

export default guardShiftService;
