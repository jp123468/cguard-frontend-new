import { ApiService } from "@/services/api/apiService";

const tid = (): string => localStorage.getItem("tenantId") || "";

// ============================================================
// Types
// ============================================================

export type AlarmProtocol = "sia-dc09" | "contactid" | "surgard" | "webhook" | "manual";
export type AlarmPanelType = "intrusion" | "fire" | "holdup" | "access" | "environmental";
export type AlarmComms = "ip" | "cellular" | "dual";
export type AlarmPanelStatus = "online" | "offline" | "armed" | "disarmed" | "unknown";

export interface AlarmPanel {
  id: string;
  name: string;
  accountNumber?: string | null;
  protocol?: AlarmProtocol;
  panelType?: AlarmPanelType;
  make?: string | null;
  model?: string | null;
  comms?: AlarmComms;
  receiverLine?: string | null;
  // NOTE: dc09Key is never returned by the API (stripped server-side).
  supervisionMins?: number | null;
  testIntervalHrs?: number | null;
  status?: AlarmPanelStatus;
  lastSignalAt?: string | null;
  postSiteId?: string | null;
  stationId?: string | null;
  customerId?: string | null;
  notes?: string | null;
  active?: boolean;
  tenantId?: string;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  zones?: AlarmZone[];
  contacts?: AlarmContact[];
}

export type AlarmZoneType =
  | "entry"
  | "perimeter"
  | "motion"
  | "glassbreak"
  | "smoke"
  | "panic"
  | "tamper"
  | "supervisory";

export interface AlarmZone {
  id: string;
  alarmPanelId?: string | null;
  zoneNumber?: string | null;
  name?: string | null;
  type?: AlarmZoneType;
  partition?: string | null;
  linkedCameraId?: string | null;
  bypassed?: boolean;
  tenantId?: string;
  panel?: AlarmPanel | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AlarmContactAuthority = "owner" | "manager" | "keyholder" | "emergency";

export interface AlarmContact {
  id: string;
  alarmPanelId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  callOrder?: number | null;
  // NOTE: passcode is never returned by the API (stripped server-side).
  authority?: AlarmContactAuthority | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AlarmSignalFormat = "sia" | "contactid" | "surgard" | "webhook" | "manual";
export type AlarmSignalQualifier = "event" | "restore" | "status";
export type AlarmSignalChannel = "ip" | "cellular" | "receiver";

export interface AlarmSignal {
  id: string;
  alarmPanelId?: string | null;
  accountNumber?: string | null;
  zoneNumber?: string | null;
  partition?: string | null;
  format?: AlarmSignalFormat | null;
  eventCode?: string | null;
  qualifier?: AlarmSignalQualifier | null;
  raw?: string | null;
  channel?: AlarmSignalChannel | null;
  receiverId?: string | null;
  receivedAt: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AlarmEventCategory =
  | "burglary"
  | "fire"
  | "holdup"
  | "panic"
  | "medical"
  | "tamper"
  | "trouble"
  | "openclose"
  | "test"
  | "supervisory"
  | "restore";

export interface AlarmEvent {
  id: string;
  alarmSignalId?: string | null;
  alarmPanelId?: string | null;
  alarmZoneId?: string | null;
  category?: AlarmEventCategory | null;
  priority?: number;
  description?: string | null;
  zoneNumber?: string | null;
  at?: string | null;
  alarmCaseId?: string | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AlarmCaseStatus =
  | "queued"
  | "acknowledged"
  | "verifying"
  | "dispatched"
  | "resolved"
  | "closed";
export type AlarmCaseDisposition = "real" | "false" | "test" | "runaway" | "cancelled";

export interface AlarmCase {
  id: string;
  alarmPanelId?: string | null;
  status?: AlarmCaseStatus;
  priority?: number;
  category?: AlarmEventCategory | string | null;
  title?: string | null;
  assignedOperatorId?: string | null;
  ackAt?: string | null;
  dispatchAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  disposition?: AlarmCaseDisposition | null;
  incidentId?: string | null;
  dispatchId?: string | null;
  postSiteId?: string | null;
  stationId?: string | null;
  customerId?: string | null;
  tenantId?: string;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  panel?: AlarmPanel | null;
  events?: AlarmEvent[];
  auditLogs?: AlarmAuditLog[];
}

export type AlarmDispatchType = "guard" | "police" | "fire" | "medical";
export type AlarmDispatchStatus = "requested" | "enroute" | "onscene" | "cleared";

export interface AlarmDispatch {
  id: string;
  alarmCaseId?: string | null;
  type?: AlarmDispatchType;
  target?: string | null;
  status?: AlarmDispatchStatus;
  eta?: string | null;
  outcome?: string | null;
  dispatchedById?: string | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlarmAuditLog {
  id: string;
  alarmCaseId?: string | null;
  action?: string | null;
  detail?: string | null;
  actorId?: string | null;
  at: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ActionPlanStepType =
  | "verify"
  | "call"
  | "video"
  | "dispatch_guard"
  | "notify_police"
  | "notify_customer"
  | "note";

export interface ActionPlanStep {
  order: number;
  type: ActionPlanStepType;
  detail?: string;
}

export interface ActionPlan {
  id: string;
  name: string;
  alarmPanelId?: string | null;
  appliesToCategory?: string | null;
  steps?: ActionPlanStep[];
  active?: boolean;
  tenantId?: string;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenCloseSchedule {
  id: string;
  alarmPanelId?: string | null;
  dayOfWeek?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  graceMins?: number | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Helpers
// ============================================================

const qstr = (params?: Record<string, string | number | undefined>): string => {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
};

// ============================================================
// Service
// ============================================================

export const alarmService = {
  // --- Panels ---
  panels(): Promise<AlarmPanel[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/panels`);
  },
  panel(id: string): Promise<AlarmPanel> {
    return ApiService.get(`/tenant/${tid()}/alarm/panel/${id}`);
  },
  createPanel(body: Partial<AlarmPanel> & { dc09Key?: string }): Promise<AlarmPanel> {
    return ApiService.post(`/tenant/${tid()}/alarm/panel`, body);
  },
  updatePanel(id: string, body: Partial<AlarmPanel> & { dc09Key?: string }): Promise<AlarmPanel> {
    return ApiService.put(`/tenant/${tid()}/alarm/panel/${id}`, body);
  },
  deletePanel(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/alarm/panel/${id}`);
  },

  // --- Zones ---
  zones(panelId: string): Promise<AlarmZone[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/panel/${panelId}/zones`);
  },
  createZone(panelId: string, body: Partial<AlarmZone>): Promise<AlarmZone> {
    return ApiService.post(`/tenant/${tid()}/alarm/panel/${panelId}/zone`, body);
  },
  updateZone(id: string, body: Partial<AlarmZone>): Promise<AlarmZone> {
    return ApiService.put(`/tenant/${tid()}/alarm/zone/${id}`, body);
  },
  deleteZone(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/alarm/zone/${id}`);
  },

  // --- Contacts ---
  contacts(panelId: string): Promise<AlarmContact[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/panel/${panelId}/contacts`);
  },
  createContact(panelId: string, body: Partial<AlarmContact> & { passcode?: string }): Promise<AlarmContact> {
    return ApiService.post(`/tenant/${tid()}/alarm/panel/${panelId}/contact`, body);
  },
  updateContact(id: string, body: Partial<AlarmContact> & { passcode?: string }): Promise<AlarmContact> {
    return ApiService.put(`/tenant/${tid()}/alarm/contact/${id}`, body);
  },
  deleteContact(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/alarm/contact/${id}`);
  },

  // --- Action Plans ---
  actionPlans(): Promise<ActionPlan[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/action-plans`);
  },
  createActionPlan(body: Partial<ActionPlan>): Promise<ActionPlan> {
    return ApiService.post(`/tenant/${tid()}/alarm/action-plan`, body);
  },
  updateActionPlan(id: string, body: Partial<ActionPlan>): Promise<ActionPlan> {
    return ApiService.put(`/tenant/${tid()}/alarm/action-plan/${id}`, body);
  },
  deleteActionPlan(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/alarm/action-plan/${id}`);
  },

  // --- Schedules ---
  schedules(panelId: string): Promise<OpenCloseSchedule[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/panel/${panelId}/schedules`);
  },
  createSchedule(panelId: string, body: Partial<OpenCloseSchedule>): Promise<OpenCloseSchedule> {
    return ApiService.post(`/tenant/${tid()}/alarm/panel/${panelId}/schedule`, body);
  },
  deleteSchedule(id: string): Promise<any> {
    return ApiService.delete(`/tenant/${tid()}/alarm/schedule/${id}`);
  },

  // --- Cases ---
  cases(params?: { status?: AlarmCaseStatus | string }): Promise<AlarmCase[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/cases${qstr(params)}`);
  },
  case(id: string): Promise<AlarmCase> {
    return ApiService.get(`/tenant/${tid()}/alarm/case/${id}`);
  },
  acknowledge(id: string): Promise<AlarmCase> {
    return ApiService.post(`/tenant/${tid()}/alarm/case/${id}/acknowledge`);
  },
  dispatch(
    id: string,
    body: { type: AlarmDispatchType; target: string; note?: string },
  ): Promise<AlarmDispatch> {
    return ApiService.post(`/tenant/${tid()}/alarm/case/${id}/dispatch`, body);
  },
  resolve(id: string): Promise<AlarmCase> {
    return ApiService.post(`/tenant/${tid()}/alarm/case/${id}/resolve`);
  },
  close(id: string, body: { disposition: AlarmCaseDisposition }): Promise<AlarmCase> {
    return ApiService.post(`/tenant/${tid()}/alarm/case/${id}/close`, body);
  },
  caseToIncident(id: string, body: any): Promise<any> {
    return ApiService.post(`/tenant/${tid()}/alarm/case/${id}/incident`, body);
  },
  addNote(id: string, body: { detail: string }): Promise<AlarmAuditLog> {
    return ApiService.post(`/tenant/${tid()}/alarm/case/${id}/note`, body);
  },

  // --- Signals / Events ---
  signals(params?: { panelId?: string; limit?: number }): Promise<AlarmSignal[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/signals${qstr(params)}`);
  },
  events(params?: { caseId?: string }): Promise<AlarmEvent[]> {
    return ApiService.get(`/tenant/${tid()}/alarm/events${qstr(params)}`);
  },
};
