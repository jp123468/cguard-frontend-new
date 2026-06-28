import api from "../api";

/**
 * CRM read of customer-generated guard ratings.
 *   GET /tenant/:tenantId/guard-ratings   query ?guardId=&limit=100
 * Returns { rows, count, average } scoped to the tenant.
 */

const getTenantId = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

const buildQuery = (params?: Record<string, any>): string => {
  if (!params) return "";
  const p = new URLSearchParams();
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      p.append(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

export interface GuardRatingRecord {
  id: string;
  guardId: string | null;
  guardName: string | null;
  clientAccountId: string | null;
  clientName: string | null;
  stationId: string | null;
  stationName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string | null;
}

export interface GuardRatingListResult {
  rows: GuardRatingRecord[];
  count: number;
  average: number | null;
}

const guardRatingService = {
  async list(params?: { guardId?: string; limit?: number }): Promise<GuardRatingListResult> {
    const tenantId = getTenantId();
    const qs = buildQuery(params);
    const resp = await api.get(`/tenant/${tenantId}/guard-ratings${qs}`);
    const payload = (resp as any)?.data ?? resp;
    return {
      rows: Array.isArray(payload?.rows) ? payload.rows : [],
      count: payload?.count ?? 0,
      average: payload?.average ?? null,
    };
  },
};

export default guardRatingService;
