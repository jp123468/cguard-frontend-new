import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import attendanceService from "@/lib/api/attendanceService";
import { EXCEPTION_LABEL, SEVERITY_META, fmtDateTime } from "./shared";
import { PageContainer, PageHeader, Section, EmptyState, SkeletonCards } from "@/components/kit";
import { AlertTriangle, Filter, ListChecks, PartyPopper } from "lucide-react";

interface ExceptionRow {
  id: string;
  type: string;
  severity: string;
  status: string;
  reason: string | null;
  detectedAt: string;
  guard?: { fullName?: string } | null;
  station?: { stationName?: string } | null;
}

const TYPE_OPTIONS = ["", "late_arrival", "no_call_no_show", "missed_clockout", "outside_geofence", "early_departure", "overtime"];

export default function NominaExceptions() {
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    attendanceService
      .exceptions({ "filter[status]": "open", "filter[type]": type || undefined, limit: 100 })
      .then((r) => setRows(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar excepciones"))
      .finally(() => setLoading(false));
  }, [type]);
  useEffect(load, [load]);

  const resolve = async (id: string) => {
    setBusy(true);
    try {
      await attendanceService.resolveException(id, { status: "resolved" });
      toast.success("Excepción resuelta");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<ExceptionRow>[] = [
    {
      key: "severity",
      header: "Severidad",
      render: (_v, r) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_META[r.severity] || ""}`}>
          {r.severity}
        </span>
      ),
    },
    { key: "type", header: "Tipo", render: (_v, r) => EXCEPTION_LABEL[r.type] || r.type },
    { key: "guard", header: "Vigilante", render: (_v, r) => r.guard?.fullName || "—" },
    { key: "station", header: "Puesto", render: (_v, r) => r.station?.stationName || "—" },
    { key: "reason", header: "Motivo", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.reason || "—"}</span> },
    { key: "detectedAt", header: "Detectado", render: (_v, r) => fmtDateTime(r.detectedAt) },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve(r.id)}>
          Resolver
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageContainer width="wide" className="p-4 sm:p-6">
        <PageHeader
          icon={<AlertTriangle />}
          title="Excepciones"
          subtitle="Desviaciones de asistencia abiertas"
          actions={
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
              <Filter className="size-4 text-muted-foreground" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t === "" ? "Todos los tipos" : EXCEPTION_LABEL[t] || t}</option>
                ))}
              </select>
            </div>
          }
        />

        <Section title="Excepciones abiertas" icon={<ListChecks />}>
          {loading ? (
            <SkeletonCards count={4} />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              emptyState={
                <EmptyState
                  icon={<PartyPopper />}
                  title="Sin excepciones abiertas"
                  description="No hay desviaciones de asistencia pendientes para los filtros seleccionados."
                />
              }
            />
          )}
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
