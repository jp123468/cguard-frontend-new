import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import attendanceService from "@/lib/api/attendanceService";
import { Loader2 } from "lucide-react";

function set<T extends object>(obj: T, path: string, value: any): T {
  const next: any = { ...obj };
  const [a, b] = path.split(".");
  next[a] = { ...(next[a] || {}), [b]: value };
  return next;
}

export default function NominaSettings() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    attendanceService
      .getSettings()
      .then((d) => setS(d))
      .catch((e) => toast.error(e?.message || "Error al cargar"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await attendanceService.saveSettings(s);
      setS(saved);
      toast.success("Configuración guardada");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const Num = ({ label, path }: { label: string; path: string }) => {
    const [a, b] = path.split(".");
    return (
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <input
          type="number"
          value={s?.[a]?.[b] ?? 0}
          onChange={(e) => setS((prev: any) => set(prev, path, Number(e.target.value)))}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
    );
  };

  const Toggle = ({ label, path }: { label: string; path: string }) => {
    const [a, b] = path.split(".");
    return (
      <label className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          checked={!!s?.[a]?.[b]}
          onChange={(e) => setS((prev: any) => set(prev, path, e.target.checked))}
        />
        <span className="text-sm text-foreground">{label}</span>
      </label>
    );
  };

  const Section = ({ title, children }: { title: string; children: any }) => (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Asistencia / Time & Attendance">
        {loading || !s ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <div className="space-y-4 pb-24">
            <Section title="General">
              <Toggle label="Reloj de asistencia habilitado" path="general.timeClockEnabled" />
              <Toggle label="Requerir selfie al marcar" path="general.requireSelfie" />
              <Toggle label="Requerir notas en excepciones" path="general.requireNotesOnException" />
            </Section>

            <Section title="Ventanas de tiempo (minutos)">
              <Num label="Entrada anticipada permitida" path="windows.earlyClockInMin" />
              <Num label="Tolerancia de retraso (gracia)" path="windows.lateGraceMin" />
              <Num label="Umbral de salida anticipada" path="windows.earlyClockoutThresholdMin" />
              <Num label="Umbral sin marcar salida" path="windows.missedClockoutThresholdMin" />
              <Num label="Umbral inasistencia (no-show)" path="windows.noShowThresholdMin" />
            </Section>

            <Section title="Geocerca">
              <Num label="Radio por defecto (m)" path="geofence.defaultRadiusM" />
              <Toggle label="Requerir validación de geocerca" path="geofence.requireValidation" />
              <Toggle label="Permitir fuera de geocerca (con aprobación)" path="geofence.allowOutsideWithApproval" />
            </Section>

            <Section title="Aprobaciones">
              <Toggle label="Auto-aprobar marcaciones normales" path="approval.autoApproveNormal" />
              <Toggle label="Requerir aprobación para excepciones" path="approval.requireApprovalForExceptions" />
              <Toggle label="Bloquear registros al cerrar la nómina" path="approval.lockAfterPayrollClose" />
            </Section>

            <Section title="Nómina">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Periodo de nómina</span>
                <select
                  value={s.payroll?.periodType || "biweekly"}
                  onChange={(e) => setS((p: any) => set(p, "payroll.periodType", e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="semimonthly">Bimensual</option>
                  <option value="monthly">Mensual</option>
                </select>
              </label>
              <Num label="Umbral de horas extra (h/turno)" path="payroll.overtimeThresholdHours" />
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Moneda</span>
                <input
                  value={s.payroll?.currency || "USD"}
                  onChange={(e) => setS((p: any) => set(p, "payroll.currency", e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <Num label="Tarifa por hora (0 = no calcular pago)" path="payroll.defaultHourlyRate" />
              <Num label="Multiplicador horas extra" path="payroll.overtimeMultiplier" />
            </Section>

            <div className="fixed bottom-6 right-6 z-10">
              <Button onClick={save} disabled={saving} className="bg-[#C8860A] hover:bg-[#B37809] text-white shadow-lg">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar configuración
              </Button>
            </div>
          </div>
        )}
      </SettingsLayout>
    </AppLayout>
  );
}
