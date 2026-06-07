import { ApiService } from "@/services/api/apiService";

const tid = (): string => localStorage.getItem("tenantId") || "";

export interface OpsAnalytics {
  range: { start: string; end: string; days: number };
  kpis: {
    guardsOnDuty: number;
    shiftsTotal: number; shiftsCovered: number; coveragePct: number;
    rondasTotal: number; rondasCompleted: number; rondaCompletionPct: number;
    scansTotal: number; scansValid: number; locationCompliancePct: number;
    incidentsTotal: number; incidentsOpen: number;
    clockinsTotal: number; clockinsOnTime: number; punctualityPct: number;
  };
  attendance: { hoursWorked: number; late: number; earlyDeparture: number; geofenceViolations: number };
  trend: Array<{ date: string; incidents: number; scans: number; rondas: number }>;
  incidentsByPriority: Array<{ label: string; count: number }>;
  topIncidentSites: Array<{ site: string; count: number }>;
  perSite: Array<{ site: string; guards: number; shiftsTotal: number; shiftsCovered: number; coveragePct: number; rondasCompleted: number; incidents: number; locationCompliancePct: number }>;
  perGuard: Array<{ name: string; shifts: number; hoursWorked: number; onTimePct: number; late: number; incidents: number }>;
}

export const analyticsService = {
  operations(params?: { startDate?: string; endDate?: string }): Promise<OpsAnalytics> {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const q = qs.toString();
    return ApiService.get(`/tenant/${tid()}/operations/analytics${q ? `?${q}` : ""}`);
  },
};
