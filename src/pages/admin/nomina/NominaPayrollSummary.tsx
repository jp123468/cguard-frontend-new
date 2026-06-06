import AppLayout from "@/layouts/app-layout";
import { FileSpreadsheet } from "lucide-react";

/**
 * Payroll Summary (payroll-ready hours per guard + export). Phase 2 — the
 * attendance data (hoursWorked, overtimeMinutes, late counts, approved
 * corrections) is already captured per guardShift; this page will aggregate it
 * by pay period and export. Final pay is not computed unless rates exist.
 */
export default function NominaPayrollSummary() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C8860A]/15 text-[#C8860A]">
          <FileSpreadsheet size={26} />
        </span>
        <h1 className="text-xl font-bold text-foreground">Resumen de Nómina</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          El resumen por periodo (horas regulares, extra, tardanzas, correcciones aprobadas y horas
          pagables) con exportación CSV/PDF llega en la siguiente fase. Los datos ya se capturan en
          cada registro de asistencia.
        </p>
      </div>
    </AppLayout>
  );
}
