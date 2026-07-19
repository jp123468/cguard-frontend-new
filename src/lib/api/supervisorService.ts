import { ApiService } from "@/services/api/apiService";

const tid = (): string => {
  const t = localStorage.getItem("tenantId");
  if (!t) throw new Error("Tenant ID no configurado");
  return t;
};

export interface Supervisor {
  id: string; // the supervisor's USER id — the stable identifier
  profileId: string | null;
  email: string | null;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  governmentId?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  maritalStatus?: string | null;
  academicInstruction?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hiringContractDate?: string | null;
  guardCredentials?: string | null;
  languages?: string[];
  skills?: string[];
  zone?: string | null;
  assignedVehicle?: string | null;
  // Turno config
  turnoDays?: number[] | null;
  turnoStart?: string | null;
  turnoEnd?: string | null;
  mobileStationId?: string | null;
  photoUrl?: string | null;
  // Live attendance
  isOnDuty: boolean;
  onDutySince?: string | null;
  dutyStatus?: string | null;
  dutyLateMinutes?: number;
  dutyScheduledEnd?: string | null;
  createdAt?: string | null;
}

export interface CreateSupervisorBody {
  email: string;
  firstName?: string;
  lastName?: string;
  governmentId?: string;
  phoneNumber?: string;
  zone?: string;
  assignedVehicle?: string;
  // Turno (recurring shift) set at creation — same fields the detail page edits.
  turnoDays?: number[];
  turnoStart?: string;
  turnoEnd?: string;
}

export const supervisorService = {
  list: (): Promise<{ rows: Supervisor[]; count: number }> =>
    ApiService.get(`/tenant/${tid()}/supervisors`),
  get: (userId: string): Promise<Supervisor> =>
    ApiService.get(`/tenant/${tid()}/supervisors/${userId}`),
  create: (body: CreateSupervisorBody): Promise<Supervisor> =>
    ApiService.post(`/tenant/${tid()}/supervisors`, body),
  update: (userId: string, body: Partial<Supervisor>): Promise<Supervisor> =>
    ApiService.put(`/tenant/${tid()}/supervisors/${userId}`, body),
  // Zone/stations the supervisor covers (resolved from their puesto assignments).
  getCoverage: (userId: string): Promise<{ positions: any[] }> =>
    ApiService.get(`/tenant/${tid()}/supervisors/${userId}/coverage`),
  // Generated upcoming schedule (rotation plan) for the supervisor.
  getSchedule: (userId: string): Promise<{ rows: any[]; position: any }> =>
    ApiService.get(`/tenant/${tid()}/supervisors/${userId}/schedule`),
};
