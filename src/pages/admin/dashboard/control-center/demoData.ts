/**
 * Demo dataset for the Control Center — a realistic, fully-populated snapshot so
 * a new tenant (with no real data yet) can preview the dashboard in operation.
 * Toggled on/off from the Panel de control; never written to the backend.
 *
 * - Guards sit AT their station → that station reads green (covered). One
 *   station is left uncovered (gold/yellow) and one has an active incident (red).
 * - Supervisors drive looping patrol routes across the map (animated via
 *   `useDemoData`).
 * Coordinates are around Quito, Ecuador.
 */
import { useEffect, useMemo, useState } from "react";
import type {
  ControlCenterData, Kpi, MapEntity, MonthPoint, ActivityItem, RevenueSeries,
} from "./types";

const GREEN = "#22c55e";   // covered
const RED = "#ef4444";     // incident
const PURPLE = "#a855f7";  // supervisor

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CENTER = { lat: -0.1807, lng: -78.4678 };

type LL = { lat: number; lng: number };

// Deterministic spread so pins don't jump between renders.
function around(i: number, spread = 0.05): LL {
  const a = (i * 137.508) * (Math.PI / 180);
  const r = ((i % 5) + 1) / 5;
  return { lat: CENTER.lat + Math.sin(a) * spread * r, lng: CENTER.lng + Math.cos(a) * spread * r };
}

const STATION_NAMES = [
  "Plaza Foch", "Torre Z", "Quicentro Shopping", "Hospital Metropolitano",
  "Edificio Banco Pichincha", "Condominio La Carolina", "Bodegas Cumbayá", "Mall El Jardín",
];
const GUARD_NAMES = [
  "Carlos Méndez", "Andrea Salazar", "Luis Quishpe", "María Tituaña",
  "Jorge Yánez", "Paola Cevallos", "Diego Andrade",
];
const SUPERVISOR_NAMES = ["Sup. Patricio Vélez", "Sup. Gabriela Ron", "Sup. Henry Cárdenas"];

const STATION_COORDS: LL[] = STATION_NAMES.map((_, i) => around(i + 1, 0.05));

function monthSeries(values: number[]): MonthPoint[] {
  return values.map((v, i) => ({ month: MONTHS[i % 12], value: v }));
}

function buildStations(): MapEntity[] {
  return STATION_NAMES.map((name, i) => {
    const incident = i === 6;       // one station with an active incident → red
    const uncovered = i === 7;      // one station with no guard → gold/yellow
    const color = incident ? RED : uncovered ? undefined : GREEN;
    return {
      id: `demo-st-${i}`, kind: "station", lat: STATION_COORDS[i].lat, lng: STATION_COORDS[i].lng,
      status: incident ? "incident" : uncovered ? "delayed" : "online",
      label: name,
      sub: incident ? "Incidente activo" : uncovered ? "Sin cobertura" : "Cubierto · 1 guardia",
      meta: { geofenceRadius: 80, ...(color ? { color } : {}) },
    };
  });
}

function buildGuards(): MapEntity[] {
  // A guard at each of the first 7 stations (so 6 covered + 1 incident station).
  return GUARD_NAMES.map((name, i) => ({
    id: `demo-g-${i}`, kind: "guard",
    // sit on the station, nudged a touch so both pins read.
    lat: STATION_COORDS[i].lat + 0.0012, lng: STATION_COORDS[i].lng + 0.0012,
    status: i === 2 ? "patrol" : "online",
    label: name, sub: STATION_NAMES[i],
    meta: { battery: 62 + ((i * 9) % 36), punchInTime: new Date(Date.now() - (i + 1) * 36e5).toISOString() },
  }));
}

// ── Supervisor patrol routes (looping rings of different radii) ──────────────
function ring(radius: number, n: number, phase: number): LL[] {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * 2 * Math.PI;
    return { lat: CENTER.lat + Math.sin(a) * radius, lng: CENTER.lng + Math.cos(a) * radius };
  });
}
const SUP_ROUTES: LL[][] = [ring(0.04, 14, 0), ring(0.026, 12, 0.7), ring(0.047, 16, 1.5)];
const SUP_SPEED = 0.09; // segments advanced per tick (~1.2s) → a smooth drive

function lerp(a: LL, b: LL, t: number): LL {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
function pointOnRoute(route: LL[], p: number): LL {
  const n = route.length;
  const pp = ((p % n) + n) % n;
  const i = Math.floor(pp);
  return lerp(route[i], route[(i + 1) % n], pp - i);
}

function supervisorsAt(step: number): MapEntity[] {
  return SUPERVISOR_NAMES.map((name, i) => {
    const route = SUP_ROUTES[i % SUP_ROUTES.length];
    const pos = pointOnRoute(route, step * SUP_SPEED + i * 2.3);
    return {
      id: `demo-sup-${i}`, kind: "supervisor", lat: pos.lat, lng: pos.lng, status: "patrol",
      label: name, sub: "Recorrido de supervisión", meta: { color: PURPLE },
    };
  });
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
    { id: "d1", kind: "alert", title: "Botón de pánico activado", sub: "Bodegas Cumbayá", at: min(3), status: "emergency" },
    { id: "d2", kind: "checkin", title: "Carlos Méndez inició turno", sub: "Plaza Foch", at: min(9), status: "online" },
    { id: "d3", kind: "patrol", title: "Sup. Patricio Vélez en recorrido", sub: "Sector La Carolina", at: min(14), status: "patrol" },
    { id: "d4", kind: "incident", title: "Acceso no autorizado", sub: "Bodegas Cumbayá", at: min(18), status: "incident" },
    { id: "d5", kind: "patrol", title: "Ronda completada (12/12 puntos)", sub: "Quicentro Shopping", at: min(26), status: "online" },
    { id: "d6", kind: "checkin", title: "Andrea Salazar fichó salida", sub: "Torre Z", at: min(41), status: "online" },
    { id: "d7", kind: "event", title: "Visitante registrado", sub: "Mall El Jardín", at: min(55), status: "online" },
    { id: "d8", kind: "incident", title: "Incidente resuelto", sub: "Hospital Metropolitano", at: min(95), status: "online" },
  ];
}

function kpi(key: string, label: string, value: number | string, extra: Partial<Kpi> = {}): Kpi {
  return { key, label, value, status: "neutral", trend: null, ...extra };
}

function buildBase(): ControlCenterData {
  const tenant: MapEntity = {
    id: "demo-tenant", kind: "tenant", lat: CENTER.lat, lng: CENTER.lng, status: "online",
    label: "Sede central", sub: "Oficina principal · Quito",
  };
  const stations = buildStations();
  const guards = buildGuards();

  const responseTrend = monthSeries([6.1, 5.8, 5.5, 5.2, 5.0, 4.8, 4.7, 4.5, 4.4, 4.3, 4.3, 4.2]);
  const incidentsTrend = monthSeries([14, 12, 15, 11, 9, 10, 8, 7, 9, 6, 5, 4]);
  const acquisitionTrend = monthSeries([1, 2, 1, 3, 2, 2, 3, 1, 4, 2, 3, 4]);

  return {
    kpis: [
      kpi("onDuty", "Guardias en servicio", guards.length, { status: "online", trend: 0.09 }),
      kpi("stations", "Puestos activos", stations.length, { status: "patrol" }),
      kpi("supervisors", "Supervisores", SUPERVISOR_NAMES.length, { status: "online" }),
      kpi("openIncidents", "Incidentes abiertos", 1, { status: "incident", trend: -0.33 }),
      kpi("clients", "Clientes", 14, { status: "neutral", trend: 0.16 }),
      kpi("response", "Tiempo de respuesta", 4.2, { unit: "min", status: "neutral", trend: -0.12 }),
      kpi("patrolsToday", "Rondas hoy", 27, { status: "online", trend: 0.21 }),
      kpi("compliance", "Cumplimiento de turnos", 96, { unit: "%", status: "online", trend: 0.04 }),
    ],
    entities: [tenant, ...stations, ...guards],
    revenue: buildRevenue(),
    incidentsTrend,
    responseTrend,
    acquisitionTrend,
    activity: buildActivity(),
    health: { sseConnected: true, onlineDevices: guards.length + SUPERVISOR_NAMES.length, lastSync: new Date().toISOString() },
    counts: { clients: 14, postSites: 9, stations: stations.length, guards: 18, team: 7, onDuty: guards.length, openIncidents: 1, supervisors: SUPERVISOR_NAMES.length },
    loading: false,
    error: null,
    gaps: [],
  };
}

/** Static snapshot (no animation) — used where a one-shot build is enough. */
export function buildDemoData(): ControlCenterData {
  const base = buildBase();
  return { ...base, entities: [...base.entities, ...supervisorsAt(0)] };
}

/**
 * Live demo data: the static fleet + supervisors driving their routes. The
 * supervisor positions advance on an interval while `active`, so they visibly
 * move across the map.
 */
export function useDemoData(active: boolean): ControlCenterData {
  const base = useMemo(() => buildBase(), []);
  const [sups, setSups] = useState<MapEntity[]>(() => supervisorsAt(0));

  useEffect(() => {
    if (!active) return;
    let step = 0;
    setSups(supervisorsAt(step));
    const id = setInterval(() => {
      step += 1;
      setSups(supervisorsAt(step));
    }, 1200);
    return () => clearInterval(id);
  }, [active]);

  return useMemo(() => ({ ...base, entities: [...base.entities, ...sups] }), [base, sups]);
}
