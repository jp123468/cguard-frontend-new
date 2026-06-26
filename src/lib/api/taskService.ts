import api from "../api";

/**
 * Client-tasks API client. A client creates a task for a station (pending_approval);
 * the CRM approves/rejects + tracks completion. Tenant-scoped.
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
    if (v === undefined || v === null || String(v).trim() === "") continue;
    p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

const unwrap = (resp: any) => (resp && resp.data !== undefined ? resp.data : resp);

export type TaskStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export interface TaskRow {
  id: string;
  taskToDo: string;
  status: TaskStatus;
  source: "client" | "staff" | null;
  priority: "alta" | "media" | "baja" | null;
  dateToDoTheTask: string;
  dateCompletedTask?: string | null;
  wasItDone: boolean;
  approvalNotes?: string | null;
  clientAccountId?: string | null;
  taskBelongsToStationId?: string | null;
  taskBelongsToStation?: { id: string; stationName: string } | null;
  createdAt: string;
}

const taskService = {
  /** Tasks by status (use status='all' for the tracking view). */
  async byStatus(params?: { status?: TaskStatus | "all"; limit?: number }) {
    const t = getTenantId();
    return unwrap(await api.get(`/tenant/${t}/task/approvals${buildQuery(params)}`));
  },
  async approve(id: string, notes?: string) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/task/${id}/approve`, { data: { notes } }));
  },
  async reject(id: string, notes?: string) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/task/${id}/reject`, { data: { notes } }));
  },
  /** Staff create — auto-approved by the backend. */
  async create(data: {
    taskToDo: string;
    dateToDoTheTask: string;
    taskBelongsToStation: string;
    priority?: "alta" | "media" | "baja";
  }) {
    const t = getTenantId();
    return unwrap(await api.post(`/tenant/${t}/task`, { data }));
  },
  /** Station options for the staff "new task" picker. */
  async stations(query = "") {
    const t = getTenantId();
    return unwrap(
      await api.get(`/tenant/${t}/station/autocomplete${buildQuery({ query, limit: 50 })}`),
    );
  },
};

export default taskService;
