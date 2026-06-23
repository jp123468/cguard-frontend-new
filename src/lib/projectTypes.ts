import { Briefcase, Search, BellRing, HelpingHand, MoreHorizontal } from 'lucide-react';
import type { ComponentType } from 'react';

export type ProjectTypeValue = 'event' | 'investigation' | 'alarm_response' | 'consulting' | 'other';
export type ProjectStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';

export interface ProjectTypeDefinition {
  value: ProjectTypeValue;
  label: string;
  description: string;
  color: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  icon: ComponentType<{ className?: string }>;
}

export const PROJECT_TYPES: ProjectTypeDefinition[] = [
  {
    value: 'event',
    label: 'Evento de seguridad',
    description: 'Seguridad para eventos puntuales: conciertos, asambleas, ferias, inauguraciones.',
    color: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-300',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-800',
    icon: Briefcase,
  },
  {
    value: 'investigation',
    label: 'Investigación',
    description: 'Investigaciones privadas, auditorías de seguridad, verificaciones de antecedentes.',
    color: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    icon: Search,
  },
  {
    value: 'alarm_response',
    label: 'Respuesta a alarma',
    description: 'Respuesta de vigilante ante activación de alarma. Sin puesto fijo permanente.',
    color: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    icon: BellRing,
  },
  {
    value: 'consulting',
    label: 'Consultoría',
    description: 'Asesoría en seguridad, análisis de riesgos, diseño de protocolos.',
    color: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-300',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    icon: HelpingHand,
  },
  {
    value: 'other',
    label: 'Otro servicio',
    description: 'Cualquier otro tipo de servicio episódico o personalizado.',
    color: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    icon: MoreHorizontal,
  },
];

export const PROJECT_TYPE_MAP = new Map<ProjectTypeValue, ProjectTypeDefinition>(
  PROJECT_TYPES.map((pt) => [pt.value, pt]),
);

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
  on_hold: 'En pausa',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-600',
  on_hold: 'bg-yellow-100 text-yellow-800',
};

export function getProjectType(value?: string | null): ProjectTypeDefinition | undefined {
  if (!value) return undefined;
  return PROJECT_TYPE_MAP.get(value as ProjectTypeValue);
}
