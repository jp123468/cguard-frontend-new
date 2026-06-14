import type { TrainingCategory, TrainingLevel, EnrollmentStatus } from '@/lib/api/trainingCourseService';

export const TRAINING_CATEGORIES: { value: TrainingCategory; label: string }[] = [
  { value: 'security', label: 'Seguridad' },
  { value: 'compliance', label: 'Cumplimiento' },
  { value: 'skills', label: 'Habilidades' },
  { value: 'safety', label: 'Prevención' },
  { value: 'other', label: 'Otro' },
];

export const TRAINING_LEVELS: { value: TrainingLevel; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  assigned: 'Asignado',
  in_progress: 'En progreso',
  completed: 'Completado',
  expired: 'Vencido',
};

export const ENROLLMENT_STATUS_VARIANT: Record<EnrollmentStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  assigned: 'secondary',
  in_progress: 'outline',
  completed: 'default',
  expired: 'destructive',
};

export function categoryLabel(value?: string): string {
  return TRAINING_CATEGORIES.find((c) => c.value === value)?.label ?? '-';
}

export function levelLabel(value?: string): string {
  return TRAINING_LEVELS.find((l) => l.value === value)?.label ?? '-';
}
