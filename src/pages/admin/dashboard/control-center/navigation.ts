/**
 * Single source of truth for where each Control Center card / field / activity
 * links to. Keeping these here (rather than as magic strings scattered through
 * the JSX) means the dashboard's navigation map is type-checked in one place and
 * trivially kept in sync with the routes declared in src/App.tsx.
 *
 * Every value below corresponds to a real route in App.tsx.
 */
import type { ActivityItem } from "./types";

/** KPI card → route, keyed by Kpi.key. Used for both live and demo data. */
export const KPI_ROUTES: Record<string, string> = {
  onDuty: "/live-tracking", // guards currently on duty → live GPS map
  stations: "/clients", // estaciones viven bajo Clientes (/post-sites redirige)
  supervisors: "/supervisors", // Equipo de seguridad › Supervisores
  openIncidents: "/activities", // live incident / event feed
  clients: "/clients",
  response: "/analytics/reporting", // response-time analytics
  patrolsToday: "/reports/site-tour", // rounds / tours report
  compliance: "/nomina/records", // shift vs. punch compliance
};

/** System-health tile label → route (tiles without an entry stay static). */
export const HEALTH_ROUTES: Record<string, string> = {
  "Dispositivos en línea": "/live-tracking",
  "Puestos / Clientes": "/post-sites",
  "Equipo administrativo": "/back-office",
};

/** Default destination per activity kind, used when an item has no explicit
 *  `to` (e.g. live SSE events that don't carry a source id). */
export const ACTIVITY_ROUTE_BY_KIND: Record<ActivityItem["kind"], string> = {
  incident: "/activities",
  checkin: "/nomina/records",
  patrol: "/reports/site-tour",
  alert: "/reports/panic-button-log",
  system: "/activities",
  event: "/activities",
};

/** Resolve an activity item's destination: an explicit per-item route (e.g. a
 *  specific incident detail) wins; otherwise the kind's default list. */
export function activityRoute(it: ActivityItem): string {
  return it.to || ACTIVITY_ROUTE_BY_KIND[it.kind] || "/activities";
}
