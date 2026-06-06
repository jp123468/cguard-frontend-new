/**
 * Demo dataset for the Control Center — a realistic, fully-populated snapshot so
 * a new tenant (with no real data yet) can preview what the dashboard looks like
 * in operation. Toggled on/off from the Panel de control; never persisted to the
 * backend. Coordinates are around Quito, Ecuador.
 */
import type {
  ControlCenterData, Kpi, MapEntity, MonthPoint, ActivityItem, RevenueSeries,
} from "./types";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Center near Quito; spread stations/guards in a small radius around it.
const CENTER = { lat: -0.1807, lng: -78.4678 };
function around(i: number, spread = 0.045) {
  // deterministic pseudo-spread so pins don't jump between renders
  const a = (i * 137.508) * (Math.PI / 180);
  const r = ((i % 5) + 1) / 5;
  return {
    lat: CENTER.lat + Math.sin(a) * spread * r,
    lng: CENTER.lng + Math.cos(a) * spread * r,
  };
}

const STATION_NAMES = [
  "Plaza Foch", "Torre Z", "Quicentro Shopping", "Hospital Metropolitano",
  "Edificio Banco Pichincha", "Condominio La Carolina", "Bodegas Cumbayá", "Mall El Jardín",
];
const GUARD_NAMES = [
  "Carlos Méndez", "Andrea Salazar", "Luis Quishpe", "María Tituaña", "Jorge Yánez",
  "Paola Cevallos", "Diego Andrade", "Verónica Lema", "Marco Pérez", "Tania Guamán",
  "Roberto Suárez", "Elena Vaca",
];

function buildEntities(): MapEntity[] {
  const e: MapEntity[] = [];
  e.push({
    id: "demo-tenant", kind: "tenant", lat: CENTER.lat, lng: CENTER.lng, status: "online",
    label: "Sede central", sub: "Oficina principal · Quito",
  });
  STATION_NAMES.forEach((name, i) => {
    const p = around(i + 1, 0.05);
    e.push({
      id: `demo-st-${i}`, kind: "station", lat: p.lat, lng: p.lng,
      status: i === 3 ? "incident" : "online",
      label: name, sub: "Puesto activo", meta: { geofenceRadius: 80 },
    });
  });
  GUARD_NAMES.forEach((name, i) => {
    const p = around(i + 11, 0.06);
    e.push({
      id: `demo-g-${i}`, kind: "guard", lat: p.lat, lng: p.lng,
      status: i === 5 ? "patrol" : i === 9 ? "delayed" : "online",
      label: name, sub: STATION_NAMES[i % STATION_NAMES.length],
      meta: { battery: 60 + ((i * 7) % 40), punchInTime: new Date(Date.now() - (i + 1) * 36e5).toISOString() },
    });
  });
  return e;
}

function monthSeries(values: number[]): MonthPoint[] {
  return values.map((v, i) => ({ month: MONTHS[i % 12], value: v }));
}

function buildRevenue(): RevenueSeries {
  const points = monthSeries([8200, 9100, 9800, 11200, 12600, 13400, 14900, 16100, 17800, 19200, 20600, 22400]);
  const total = points.reduce((a, b) => a + b.value, 0);
  return { points, total, paid: Math.round(total * 0.78), pending: Math.round(total * 0.22), currency: "USD", hasData: true };
}

function buildActivity(): ActivityItem[] {
  const now = Date.now();
  const min = (m: number) => new Date(now - m * 60000).toISOString();
  return [
    { id: "d1", kind: "alert", title: "Botón de pánico activado", sub: "Hospital Metropolitano", at: min(3), status: "emergency" },
    { id: "d2", kind: "checkin", title: "Carlos Méndez inició turno", sub: "Plaza Foch", at: min: 9 as any ? min(9) : min(9), status: "online" },
    { id: "d3", kind: "incident", title: "Acceso no autorizado", sub: "Edificio Banco Pichincha", at: min(18), status: "incident" },
    { id: "d4", kind: "patrol", title: "Ronda completada (12/12 puntos)", sub: "Quicentro Shopping", at: min(26), status: "online" },
    { id: "d5", kind: "checkin", title: "Andrea Salazar fichó salida", sub: "Torre Z", at: min(41), status: "online" },
    { id: "d6", kind: "event", title: "Visitante registrado", sub: "Mall El Jardín", at: min(55), status: "online" },
    { id: "d7", kind: "patrol", title: "Ronda iniciada", sub: "Condominio La Carolina", at: min(72), status: "patrol" },
    { id: "d8", kind: "incident", title: "Incidente resuelto", sub: "Bodegas Cumbayá", at: min(95), status: "online" },
  ];
}

function kpi(key: string, label: string, value: number | string, extra: Partial<Kpi> = {}): Kpi {
  return { key, label, value, status: "neutral", trend: null, ...extra };
}

export function buildDemoData(): ControlCenterData {
  const responseTrend = monthSeries([6.1, 5.8, 5.5, 5.2, 5.0, 4.8, 4.7, 4.5, 4.4, 4.3, 4.3, 4.2]);
  const incidentsTrend = monthSeries([14, 12, 15, 11, 9, 10, 8, 7, 9, 6, 5, 4]);
  const acquisitionTrend = monthSeries([1, 2, 1, 3, 2, 2, 3, 1, 4, 2, 3, 4]);

  return {
    kpis: [
      kpi("onDuty", "Guardias en servicio", 12, { status: "online", trend: 0.09 }),
      kpi("stations", "Puestos activos", 8, { status: "patrol" }),
      kpi("supervisors", "Supervisores", 3, { status: "online" }),
      kpi("openIncidents", "Incidentes abiertos", 2, { status: "incident", trend: -0.33 }),
      kpi("clients", "Clientes", 14, { status: "neutral", trend: 0.16 }),
      kpi("response", "Tiempo de respuesta", 4.2, { unit: "min", status: "neutral", trend: -0.12 }),
      kpi("patrolsToday", "Rondas hoy", 27, { status: "online", trend: 0.21 }),
      kpi("compliance", "Cumplimiento de turnos", 96, { unit: "%", status: "online", trend: 0.04 }),
    ],
    entities: buildEntities(),
    revenue: buildRevenue(),
    incidentsTrend,
    responseTrend,
    acquisitionTrend,
    activity: buildActivity(),
    health: { sseConnected: true, onlineDevices: 12, lastSync: new Date().toISOString() },
    counts: { clients: 14, postSites: 9, stations: 8, guards: 18, team: 7, onDuty: 12, openIncidents: 2, supervisors: 3 },
    loading: false,
    error: null,
    gaps: [],
  };
}
