export interface RotationStyle { id: string; name: string; description?: string; dayShifts: number; nightShifts: number; restDays: number; isSystem: boolean; }
export interface StationPosition { id: string; name: string; type: 'fijo' | 'sacafranco'; startTime: string; endTime: string; guardsNeeded: number; sortOrder: number; platoonOffset: number; stationId: string; }
export interface GuardRef { id: string; firstName: string; lastName: string; email?: string; }
export interface GuardAssignment { id: string; guardId: string; stationId: string; positionId: string; rotationStyleId: string; startDate: string; endDate?: string; platoonOffset: number; isRelief: boolean; status: string; guard?: GuardRef; position?: StationPosition; rotationStyle?: RotationStyle; }
export interface ShiftRecord { id: string; guardId: string; stationId: string; positionId?: string; startTime: string; endTime: string; guard?: Pick<GuardRef, 'id' | 'firstName' | 'lastName'>; }
export interface ScheduleOverride { id: string; guardId: string; assignmentId?: string; date: string; type: string; note?: string; }
export interface GuardOption { id: string; label: string; }
