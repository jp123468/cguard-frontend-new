import {
  FileText, AlertTriangle, ClipboardList, Clock, DollarSign, ScrollText,
  LogIn, Route, CheckSquare, Activity, Car, ListChecks, BarChart3, Gauge,
  Siren, MapPin, TriangleAlert, IdCard, Package, Video, PauseCircle, FileCheck,
  ShieldAlert, Flame, Footprints, Eye, Building2, Users, Wrench, Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Accent themes keyed to each report section. */
export const SECTION_THEME: Record<string, { icon: LucideIcon; from: string; to: string; text: string; ring: string }> = {
  general:  { icon: FileText,      from: 'from-sky-500/15',     to: 'to-sky-500/5',     text: 'text-sky-500',     ring: 'group-hover:ring-sky-500/30' },
  incidents:{ icon: AlertTriangle, from: 'from-red-500/15',     to: 'to-red-500/5',     text: 'text-red-500',     ring: 'group-hover:ring-red-500/30' },
  standard: { icon: ClipboardList, from: 'from-violet-500/15',  to: 'to-violet-500/5',  text: 'text-violet-500',  ring: 'group-hover:ring-violet-500/30' },
  timecard: { icon: Clock,         from: 'from-emerald-500/15', to: 'to-emerald-500/5', text: 'text-emerald-500', ring: 'group-hover:ring-emerald-500/30' },
  payroll:  { icon: DollarSign,    from: 'from-amber-500/15',   to: 'to-amber-500/5',   text: 'text-amber-500',   ring: 'group-hover:ring-amber-500/30' },
  logs:     { icon: ScrollText,    from: 'from-teal-500/15',    to: 'to-teal-500/5',    text: 'text-teal-500',    ring: 'group-hover:ring-teal-500/30' },
};

const ID_ICON: Array<[RegExp, LucideIcon]> = [
  [/entry-exit|check.?in|check.?out/, LogIn],
  [/site-tour|tour|checkpoint|recorrido/, Route],
  [/task|tarea/, CheckSquare],
  [/dar/, Activity],
  [/vehicle-patrol|patrol/, Car],
  [/vehicle-inspection/, Car],
  [/checklist|verificaci/, ListChecks],
  [/post-kpi/, Gauge],
  [/guard-kpi|kpi/, BarChart3],
  [/parking/, Car],
  [/break-in/, ShieldAlert],
  [/fire/, Flame],
  [/vandalism|trespass/, TriangleAlert],
  [/suspicious/, Eye],
  [/police/, Siren],
  [/incident/, AlertTriangle],
  [/hourly/, Clock],
  [/equipment/, Wrench],
  [/timecard-client|payroll-client/, Building2],
  [/timecard-post|payroll-post/, MapPin],
  [/timecard-guard/, Users],
  [/skillset/, Boxes],
  [/department/, Users],
  [/delivery|passdown|entrega/, Package],
  [/watch-mode|vigilancia/, Video],
  [/idle|inactiv/, PauseCircle],
  [/panic|pánico|panico/, Siren],
  [/geofence|geo-fence|valla/, MapPin],
  [/fall|caída|caida/, TriangleAlert],
  [/order-ack|órdenes/, FileCheck],
  [/document-ack|doc-policy/, FileCheck],
  [/license|licencia/, IdCard],
  [/idle-guard|guard-idle/, Footprints],
];

export function iconForReport(id: string, sectionId: string): LucideIcon {
  for (const [re, icon] of ID_ICON) if (re.test(id)) return icon;
  return SECTION_THEME[sectionId]?.icon || FileText;
}
