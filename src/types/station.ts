import type { GuardAssignment } from './schedule';
export interface Station { id: string; stationName: string; scheduleType?: string; rotationStyleId?: string; postSiteId?: string; latitud?: number | null; longitud?: number | null; address?: string; active?: boolean; startDate?: string | null; endDate?: string | null; assignedGuards?: GuardAssignment[]; guardsCount?: number; tenantId?: string; }
