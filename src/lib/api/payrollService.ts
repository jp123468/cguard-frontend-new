import api from "../api";

/**
 * Rol de pagos (payroll) API client. Computes the Ecuadorian payroll from the
 * timesheets (guardShift hours) + configured salary so the CRM can render + EXPORT
 * the planilla for the accountant to run transfers/checks. Tenant-scoped.
 */
const getTenantId = (): string => localStorage.getItem("tenantId") || "";

export interface RosterRow {
  guardId: string;
  guardName: string;
  role?: "guard" | "supervisor" | "administrative";
  monthlyRemuneration: number;
  salarySource: "guard-override" | "tenant-default" | "sbu-fallback";
  yearsOfService: number;
  aggregate: { shiftCount: number; daysWorked?: number; regularHours: number; overtimeHours: number };
  payroll: {
    earnings: {
      baseSalary: number; supplementaryPay: number; extraordinaryPay: number; nightSurcharge: number;
      decimoTercero: number; decimoCuarto: number; fondosReserva: number; other: number;
      imponible: number; totalEarnings: number;
    };
    deductions: { iessPersonal: number; incomeTax: number; other: number; totalDeductions: number };
    employerCost: {
      iessPatronal: number; decimoTerceroProvision: number; decimoCuartoProvision: number;
      fondosReservaProvision: number; vacacionesProvision: number; totalCost: number;
    };
    netPay: number;
  };
}

export interface RosterTotals {
  imponible: number; totalEarnings: number; iessPersonal: number;
  totalDeductions: number; iessPatronal: number; employerCost: number; netPay: number;
}

export interface Roster {
  year: number; month: number; currency: string; count: number;
  rows: RosterRow[]; totals: RosterTotals;
}

export interface RosterFlags {
  decimoTerceroMensualizado?: boolean;
  decimoCuartoMensualizado?: boolean;
  fondosReservaMensualizado?: boolean;
}

const unwrap = (resp: any) => (resp && resp.data !== undefined ? resp.data : resp);

export const payrollService = {
  /** Whole-tenant rol de pagos for a month (one row per guard + totals). */
  async roster(year: number, month: number, flags?: RosterFlags): Promise<Roster> {
    const t = getTenantId();
    const p = new URLSearchParams({ year: String(year), month: String(month) });
    if (flags?.decimoTerceroMensualizado) p.set("decimoTerceroMensualizado", "true");
    if (flags?.decimoCuartoMensualizado) p.set("decimoCuartoMensualizado", "true");
    if (flags?.fondosReservaMensualizado) p.set("fondosReservaMensualizado", "true");
    return unwrap(await api.get(`/tenant/${t}/payroll/roster?${p.toString()}`, { toast: { silentError: true } }));
  },

  /** The statutory figures used (SBU, IESS %, IR brackets) for a year. */
  async statutory(year?: number) {
    const t = getTenantId();
    const q = year ? `?year=${year}` : "";
    return unwrap(await api.get(`/tenant/${t}/payroll/statutory${q}`, { toast: { silentError: true } }));
  },
};

export default payrollService;
