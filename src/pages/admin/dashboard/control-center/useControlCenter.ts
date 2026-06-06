import { useCallback, useEffect, useRef, useState } from "react";
import api, { getAuthToken } from "@/lib/api";
import securityGuardService from "@/lib/api/securityGuardService";
import tenantService from "@/services/tenant.service";
import type {
  ControlCenterData, DashboardStats, Kpi, MapEntity, MonthPoint,
  RevenueSeries, ActivityItem, LiveStatus,
} from "./types";

const tenantId = () => localStorage.getItem("tenantId") || "";
const num = (v: any) => (typeof v === "number" ? v : Number(v) || 0);
const count = (r: any) => (!r ? 0 : r.total ?? r.count ?? (Array.isArray(r.rows) ? r.rows.length : Array.isArray(r) ? r.length : 0));
const rows = (r: any): any[] => (Array.isArray(r) ? r : r?.rows ?? r?.data ?? []);
const coord = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}
const get = (path: string) => api.get(`/tenant/${tenantId()}${path}`).then((r) => r.data);

/** Single hook that powers the whole Control Center. Wires the real backend
 *  endpoints discovered in the audit; documents gaps via `gaps[]` and marks
 *  any fallback KPI with `fallback: true` instead of inventing data. */
export function useControlCenter(intervalSec = 15): ControlCenterData & { refresh: () => void } {
  const [state, setState] = useState<ControlCenterData>({
    kpis: [], entities: [], revenue: emptyRevenue(), incidentsTrend: [], responseTrend: [],
    acquisitionTrend: [], activity: [], health: { sseConnected: false, onlineDevices: 0, lastSync: "" },
    counts: {}, loading: true, error: null, gaps: [],
  });
  const sseRef = useRef<EventSource | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // ── primary load (stats + entities) ─────────────────────────────────────
  useEffect(() => {
    if (!tenantId()) { setState((s) => ({ ...s, loading: false, error: "no-tenant" })); return; }
    let alive = true;
    (async () => {
      const gaps: string[] = [];
      const [stats, active, stationsR, postsR, clientsR, guardsR, incidentsR, usersR, tenantR] = await Promise.all([
        safe<DashboardStats>(get("/dashboard/stats"), {}),
        safe(securityGuardService.activeLocations(), null as any),
        safe(get("/station?limit=500"), null),
        safe(get("/post-site?limit=500"), null),
        safe(get("/client-account?limit=500"), null),
        safe(get("/security-guard?limit=1"), null),
        safe(get("/incident?limit=50&orderBy=createdAt_DESC"), null),
        safe(get("/user"), null),
        safe(tenantService.findById(tenantId()), null as any),
      ]);
      if (!alive) return;

      const stationRows = rows(stationsR);
      const postRows = rows(postsR);
      const activeRows = rows(active);
      const incidentRows = rows(incidentsR);
      const userRows = rows(usersR);

      // ── live entities for the map ──
      const entities: MapEntity[] = [];
      const tenant = tenantR?.data ?? tenantR ?? null;
      const tLat = coord(tenant?.latitude), tLng = coord(tenant?.longitude);
      if (tLat != null && tLng != null) {
        entities.push({ id: "tenant", kind: "tenant", lat: tLat, lng: tLng, status: "online",
          label: tenant?.name || "Sede central", sub: tenant?.address || "Oficina principal" });
      } else gaps.push("Tenant sin coordenadas (latitude/longitude) — pin de sede oculto.");

      stationRows.forEach((s: any) => {
        const la = coord(s.latitud ?? s.latitude), ln = coord(s.longitud ?? s.longitude);
        if (la == null || ln == null) return;
        entities.push({ id: `st-${s.id}`, kind: "station", lat: la, lng: ln, status: "online",
          label: s.stationName || s.name || "Puesto", sub: s.postSiteName || "", meta: { geofenceRadius: s.geofenceRadius } });
      });

      let onDuty = 0;
      activeRows.forEach((g: any) => {
        const la = coord(g.latitude ?? g.lat ?? g.punchInLatitude), ln = coord(g.longitude ?? g.lng ?? g.punchInLongitude);
        onDuty++;
        if (la == null || ln == null) return;
        entities.push({ id: `g-${g.guardId || g.id}`, kind: "guard", lat: la, lng: ln, status: "online",
          label: g.fullName || g.name || "Guardia", sub: g.postSiteName || "En servicio",
          meta: { punchInTime: g.punchInTime, battery: g.punchInBattery } });
      });

      // ── revenue from /dashboard/stats (billing.montoPorPagar by month) ──
      const revPoints: MonthPoint[] = (stats.revenue || []).map((r) => ({ month: r.month, value: num(r.revenue) }));
      const revTotal = revPoints.reduce((a, b) => a + b.value, 0);
      const revenue: RevenueSeries = {
        points: revPoints, total: revTotal,
        paid: 0, pending: 0, currency: "USD", hasData: revPoints.some((p) => p.value > 0),
      };
      if (!revenue.hasData) gaps.push("Sin datos de facturación (billing) — sección de ingresos en estado vacío.");
      // paid/pending split: no aggregation endpoint — leave 0 + documented gap
      gaps.push("No existe endpoint de desglose pagado/pendiente; se requiere /revenue/summary.");

      const incidentsTrend: MonthPoint[] = (stats.securityPerformance || []).map((m) => ({ month: m.month?.slice(0, 3), value: num(m.incidents) }));
      const responseTrend: MonthPoint[] = (stats.securityPerformance || []).map((m) => ({ month: m.month?.slice(0, 3), value: num(m.responseTime) }));
      const acquisitionTrend: MonthPoint[] = (stats.clientAcquisition || []).map((m) => ({ month: m.month, value: num(m.count) }));

      // ── counts ──
      const openIncidents = incidentRows.filter((i: any) => (i.status || "").toLowerCase() === "abierto").length;
      const supervisors = userRows.filter((u: any) => {
        const roles = ([] as string[]).concat(u.roles || u.role || [], ...((u.tenants || []).map((t: any) => t.roles || [])));
        return roles.map((r: any) => String(r).toLowerCase()).some((r: string) => r.includes("supervisor") || r === "operationsmanager" || r === "dispatcher");
      }).length;
      const counts = {
        clients: count(clientsR), postSites: postRows.length || count(postsR),
        stations: stationRows.length || count(stationsR), guards: count(guardsR),
        team: userRows.length, onDuty, openIncidents, supervisors,
      };

      const lastResponse = responseTrend.length ? responseTrend[responseTrend.length - 1].value : null;

      // ── KPIs (real where available; fallback flagged otherwise) ──
      const kpis: Kpi[] = [
        kpi("onDuty", "Guardias en servicio", onDuty, { status: onDuty > 0 ? "online" : "offline" }),
        kpi("stations", "Puestos activos", counts.stations, { status: "patrol" }),
        kpi("supervisors", "Supervisores", supervisors, { status: "online", hint: "Estado en línea no disponible en backend." , fallback: supervisors === 0 }),
        kpi("openIncidents", "Incidentes abiertos", openIncidents, { status: openIncidents > 0 ? "incident" : "online" }),
        kpi("clients", "Clientes", counts.clients, { status: "neutral" }),
        kpi("response", "Tiempo de respuesta", lastResponse ?? "—", { unit: lastResponse != null ? "min" : "", status: "neutral", trend: trendOf(responseTrend, true), fallback: lastResponse == null, hint: lastResponse == null ? "Sin datos de desempeño." : undefined }),
        kpi("patrolsToday", "Rondas hoy", "—", { fallback: true, hint: "Falta endpoint de estadísticas de rondas (tourAssignment por estado/fecha)." }),
        kpi("compliance", "Cumplimiento de turnos", "—", { unit: "%", fallback: true, hint: "Requiere agregación de turnos vs. fichajes." }),
      ];

      const activity: ActivityItem[] = incidentRows.slice(0, 8).map((i: any) => ({
        id: `inc-${i.id}`, kind: "incident",
        title: i.title || i.subject || "Incidente",
        sub: i.location || i.stationName || "",
        at: i.incidentAt || i.createdAt || new Date().toISOString(),
        status: (i.status || "").toLowerCase() === "abierto" ? "incident" : "online",
        to: i.id ? `/reports/incident/${i.id}` : undefined,
      }));

      setState((s) => ({
        ...s, kpis, entities, revenue, incidentsTrend, responseTrend, acquisitionTrend,
        activity, counts, loading: false, error: null, gaps: dedupe(gaps),
        health: { ...s.health, onlineDevices: onDuty, lastSync: new Date().toISOString() },
      }));
    })();
    return () => { alive = false; };
  }, [tick]);

  // ── live polling of on-duty guard locations ─────────────────────────────
  useEffect(() => {
    if (!tenantId()) return;
    const iv = setInterval(async () => {
      const active = await safe(securityGuardService.activeLocations(), null as any);
      const activeRows = rows(active);
      setState((s) => {
        const others = s.entities.filter((e) => e.kind !== "guard");
        const guards: MapEntity[] = [];
        let onDuty = 0;
        activeRows.forEach((g: any) => {
          onDuty++;
          const la = coord(g.latitude ?? g.punchInLatitude), ln = coord(g.longitude ?? g.punchInLongitude);
          if (la == null || ln == null) return;
          guards.push({ id: `g-${g.guardId || g.id}`, kind: "guard", lat: la, lng: ln, status: "online",
            label: g.fullName || "Guardia", sub: g.postSiteName || "En servicio", meta: { battery: g.punchInBattery } });
        });
        return { ...s, entities: [...others, ...guards],
          health: { ...s.health, onlineDevices: onDuty, lastSync: new Date().toISOString() } };
      });
    }, Math.max(5, intervalSec) * 1000);
    return () => clearInterval(iv);
  }, [intervalSec]);

  // ── SSE live event feed (real-time layer the backend already exposes) ────
  useEffect(() => {
    if (!tenantId()) return;
    const token = getAuthToken();
    const base = (import.meta as any).env?.VITE_API_URL || "";
    if (!base || !token) return;
    let es: EventSource | null = null;
    try {
      // NOTE: events routes are mounted at /api/:tenantId/events/* (no /tenant/ segment),
      // unlike the rest of the tenant API.
      es = new EventSource(`${base}/${tenantId()}/events/stream?token=${encodeURIComponent(token)}`);
      sseRef.current = es;
      es.onopen = () => setState((s) => ({ ...s, health: { ...s.health, sseConnected: true } }));
      es.onerror = () => setState((s) => ({ ...s, health: { ...s.health, sseConnected: false } }));
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const item: ActivityItem = {
            id: data.id || `ev-${Date.now()}`, kind: mapEventKind(data.type),
            title: data.title || data.message || data.type || "Evento",
            sub: data.subtitle || data.stationName || "", at: data.createdAt || new Date().toISOString(),
            status: data.severity === "critical" ? "emergency" : "online",
          };
          setState((s) => ({ ...s, activity: [item, ...s.activity].slice(0, 30) }));
        } catch { /* heartbeat / non-JSON */ }
      };
    } catch { /* SSE unsupported — polling above still drives the map */ }
    return () => { es?.close(); sseRef.current = null; };
  }, []);

  return { ...state, refresh };
}

function kpi(key: string, label: string, value: number | string, extra: Partial<Kpi> = {}): Kpi {
  return { key, label, value, status: "neutral", trend: null, ...extra };
}
function trendOf(points: MonthPoint[], inverse = false): number | null {
  if (points.length < 2) return null;
  const a = points[points.length - 2].value, b = points[points.length - 1].value;
  if (a === 0) return null;
  const t = (b - a) / Math.abs(a);
  return inverse ? -t : t;
}
function mapEventKind(type?: string): ActivityItem["kind"] {
  const t = (type || "").toLowerCase();
  if (t.includes("incident")) return "incident";
  if (t.includes("clock") || t.includes("checkin")) return "checkin";
  if (t.includes("tour") || t.includes("patrol") || t.includes("ronda")) return "patrol";
  if (t.includes("alert") || t.includes("panic") || t.includes("emergency")) return "alert";
  return "event";
}
function emptyRevenue(): RevenueSeries { return { points: [], total: 0, paid: 0, pending: 0, currency: "USD", hasData: false }; }
function dedupe(a: string[]) { return Array.from(new Set(a)); }
