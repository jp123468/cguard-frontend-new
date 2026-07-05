import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Save, CalendarClock } from "lucide-react";
import { PageContainer, PageHeader, Section, SkeletonCards, StatusBadge } from "@/components/kit";
import { supervisorService, type Supervisor } from "@/lib/api/supervisorService";

const WEEKDAYS = [
  { n: 1, label: "Lun" }, { n: 2, label: "Mar" }, { n: 3, label: "Mié" },
  { n: 4, label: "Jue" }, { n: 5, label: "Vie" }, { n: 6, label: "Sáb" }, { n: 0, label: "Dom" },
];

/** Editable profile fields (subset the CRM manages). */
const FIELDS: Array<{ key: keyof Supervisor; label: string; type?: string }> = [
  { key: "firstName", label: "Nombres" },
  { key: "lastName", label: "Apellidos" },
  { key: "governmentId", label: "Cédula / ID" },
  { key: "phoneNumber", label: "Teléfono" },
  { key: "zone", label: "Zona / sector" },
  { key: "assignedVehicle", label: "Vehículo asignado" },
  { key: "gender", label: "Género" },
  { key: "bloodType", label: "Tipo de sangre" },
  { key: "birthDate", label: "Fecha de nacimiento", type: "date" },
  { key: "birthPlace", label: "Lugar de nacimiento" },
  { key: "maritalStatus", label: "Estado civil" },
  { key: "academicInstruction", label: "Instrucción académica" },
  { key: "address", label: "Dirección" },
  { key: "hiringContractDate", label: "Fecha de contratación", type: "date" },
  { key: "guardCredentials", label: "Credencial" },
];

export default function SupervisorDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [sup, setSup] = useState<Supervisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, any>>({});
  const [turnoDays, setTurnoDays] = useState<number[]>([]);
  const [turnoStart, setTurnoStart] = useState("");
  const [turnoEnd, setTurnoEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleDay = (n: number) =>
    setTurnoDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));

  const load = useCallback(() => {
    setLoading(true);
    supervisorService
      .get(id)
      .then((s) => {
        setSup(s);
        const init: Record<string, any> = {};
        for (const f of FIELDS) init[f.key as string] = (s as any)[f.key] ?? "";
        setForm(init);
        setTurnoDays(Array.isArray(s.turnoDays) ? s.turnoDays : []);
        setTurnoStart(s.turnoStart || "");
        setTurnoEnd(s.turnoEnd || "");
      })
      .catch(() => toast.error("No se pudo cargar el supervisor"))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      for (const f of FIELDS) {
        const v = form[f.key as string];
        body[f.key as string] = v === "" ? null : v;
      }
      body.turnoDays = turnoDays.length ? turnoDays : null;
      body.turnoStart = turnoStart || null;
      body.turnoEnd = turnoEnd || null;
      const updated = await supervisorService.update(id, body);
      setSup(updated);
      toast.success("Perfil actualizado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <PageContainer width="wide">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/supervisors")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Supervisores
            </Button>
          </div>

          {loading ? (
            <SkeletonCards count={4} />
          ) : sup ? (
            <>
              <PageHeader
                icon={<ShieldCheck />}
                title={sup.fullName}
                subtitle={sup.email || undefined}
                badges={
                  sup.isOnDuty
                    ? <StatusBadge tone="green">En turno</StatusBadge>
                    : <StatusBadge tone="slate" dot={false}>Fuera de turno</StatusBadge>
                }
                actions={
                  <Button variant="brand" onClick={save} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
                  </Button>
                }
              />

              <Section
                title="Turno del supervisor"
                icon={<CalendarClock />}
                contentClassName="space-y-4"
              >
                <p className="text-xs text-muted-foreground">
                  Define el turno que el supervisor debe cumplir. Marcará entrada/salida
                  desde la app y su asistencia se mide contra esta ventana (llegada tarde
                  y cierre automático al finalizar).
                </p>
                <div>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Días</span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.n}
                        type="button"
                        onClick={() => toggleDay(d.n)}
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                          turnoDays.includes(d.n)
                            ? "border-primary bg-primary/10 font-medium text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:max-w-md">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrada</span>
                    <Input type="time" value={turnoStart} onChange={(e) => setTurnoStart(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Salida</span>
                    <Input type="time" value={turnoEnd} onChange={(e) => setTurnoEnd(e.target.value)} />
                  </label>
                </div>
                {sup.isOnDuty && (
                  <div className="text-xs text-muted-foreground">
                    Estado actual:{" "}
                    <span className={sup.dutyStatus === "late" ? "font-medium text-amber-600" : "font-medium text-emerald-600"}>
                      {sup.dutyStatus === "late" ? `En turno (tarde ${sup.dutyLateMinutes} min)` : sup.dutyStatus === "no_schedule" ? "En turno (sin turno programado)" : "En turno a tiempo"}
                    </span>
                  </div>
                )}
              </Section>

              <Section title="Perfil del supervisor" icon={<ShieldCheck />}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {FIELDS.map((f) => (
                    <label key={f.key as string} className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{f.label}</span>
                      <Input
                        type={f.type || "text"}
                        value={form[f.key as string] ?? ""}
                        onChange={(e) => setForm((s) => ({ ...s, [f.key as string]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </Section>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Supervisor no encontrado</div>
          )}
        </PageContainer>
      </div>
    </AppLayout>
  );
}
