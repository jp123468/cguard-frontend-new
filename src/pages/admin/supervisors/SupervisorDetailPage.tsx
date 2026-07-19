import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import GuardsLayout from "@/layouts/GuardsLayout";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarClock, Car, MapPin, User as UserIcon,
  Pencil, Mail, Phone, Check,
} from "lucide-react";
import { supervisorService, type Supervisor } from "@/lib/api/supervisorService";

const GOLD = "#C8860A";

const WEEKDAYS = [
  { n: 1, label: "Lun" }, { n: 2, label: "Mar" }, { n: 3, label: "Mié" },
  { n: 4, label: "Jue" }, { n: 5, label: "Vie" }, { n: 6, label: "Sáb" }, { n: 0, label: "Dom" },
];

const FIELD_OPTIONS: Record<string, string[]> = {
  gender: ["Masculino", "Femenino"],
  bloodType: ["A+", "A-", "AB+", "AB-", "O+", "O-", "B+", "B-"],
  maritalStatus: ["Soltero", "Casado", "Unión libre", "Divorciado"],
  academicInstruction: ["Primaria", "Secundaria", "Universitaria", "Universidad", "Especial"],
};

function toDateInput(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function fmtDate(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("es");
}

// ── presentational helpers (match the vigilante profile) ────────────────────
const Section = ({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-card border rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h4 className="font-semibold text-sm tracking-tight">{title}</h4>
      </div>
      {action}
    </div>
    {children}
  </div>
);
const ReadField = ({ label, value }: { label: string; value: any }) => (
  <div className="min-w-0">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
    <div className="font-medium text-sm text-foreground truncate">{value || "—"}</div>
  </div>
);
const EditText = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
    <Input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
  </div>
);
const EditSelect = ({ label, value, field, onChange }: { label: string; value: string; field: string; onChange: (v: string) => void }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm flex w-full rounded-md border border-input bg-background px-2">
      <option value="">Seleccionar…</option>
      {(FIELD_OPTIONS[field] || []).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default function SupervisorDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [sup, setSup] = useState<Supervisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, any>>({});

  const setField = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const hydrate = (s: Supervisor) => {
    setSup(s);
    setForm({
      governmentId: s.governmentId ?? "", birthDate: toDateInput(s.birthDate), birthPlace: s.birthPlace ?? "",
      address: s.address ?? "", gender: s.gender ?? "", bloodType: s.bloodType ?? "", maritalStatus: s.maritalStatus ?? "",
      academicInstruction: s.academicInstruction ?? "", guardCredentials: s.guardCredentials ?? "",
      hiringContractDate: toDateInput(s.hiringContractDate), zone: s.zone ?? "", assignedVehicle: s.assignedVehicle ?? "",
    });
  };

  const load = useCallback(() => {
    setLoading(true);
    supervisorService.get(id)
      .then(hydrate)
      .catch(() => toast.error("No se pudo cargar el supervisor"))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  const beginEdit = () => { if (sup) hydrate(sup); setEditing(true); };
  const cancelEdit = () => { if (sup) hydrate(sup); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      for (const k of Object.keys(form)) body[k] = form[k] === "" ? null : form[k];
      const updated = await supervisorService.update(id, body);
      hydrate(updated);
      setEditing(false);
      toast.success("Perfil actualizado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onDuty = !!sup?.isOnDuty;

  return (
    <AppLayout>
      <GuardsLayout navKey="supervisors" title="Perfil del supervisor">
        <div className="mx-auto max-w-5xl space-y-6 pb-24">
          {loading ? (
            <div className="h-40 rounded-2xl border bg-card animate-pulse" />
          ) : sup ? (
            <>
              {/* Edit toolbar — the supervisor's identity (avatar/name/status)
                  lives in the shared GuardsLayout header card above. */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Información del supervisor</h2>
                <div className="flex items-center gap-2">
                  {!editing ? (
                    <button onClick={beginEdit} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm hover:opacity-90 transition" style={{ background: GOLD }}>
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                  ) : (
                    <>
                      <button onClick={cancelEdit} disabled={saving} className="text-sm px-3 py-2 rounded-lg border hover:bg-muted transition disabled:opacity-50">Cancelar</button>
                      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white shadow-sm disabled:opacity-50" style={{ background: GOLD }}>
                        {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                        {saving ? "Guardando…" : "Guardar"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing && (
                <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  El nombre, correo y teléfono son la identidad del supervisor y se gestionan desde la invitación de acceso (Usuarios de administración).
                </div>
              )}

              {/* ── BODY GRID ────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* MAIN (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                  <Section title="Información general">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ReadField label="Nombres" value={sup.firstName} />
                      <ReadField label="Apellidos" value={sup.lastName} />
                      {editing ? (
                        <>
                          <EditText label="Cédula / ID" value={form.governmentId} onChange={(v) => setField("governmentId", v)} />
                          <EditText label="Fecha de nacimiento" value={form.birthDate} onChange={(v) => setField("birthDate", v)} type="date" />
                          <EditText label="Lugar de nacimiento" value={form.birthPlace} onChange={(v) => setField("birthPlace", v)} />
                          <EditText label="Dirección" value={form.address} onChange={(v) => setField("address", v)} />
                        </>
                      ) : (
                        <>
                          <ReadField label="Cédula / ID" value={sup.governmentId} />
                          <ReadField label="Fecha de nacimiento" value={fmtDate(sup.birthDate)} />
                          <ReadField label="Lugar de nacimiento" value={sup.birthPlace} />
                          <ReadField label="Dirección" value={sup.address} />
                        </>
                      )}
                    </div>
                  </Section>

                  <Section title="Información personal">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {editing ? (
                        <>
                          <EditSelect label="Género" field="gender" value={form.gender} onChange={(v) => setField("gender", v)} />
                          <EditSelect label="Tipo de sangre" field="bloodType" value={form.bloodType} onChange={(v) => setField("bloodType", v)} />
                          <EditSelect label="Estado civil" field="maritalStatus" value={form.maritalStatus} onChange={(v) => setField("maritalStatus", v)} />
                          <EditSelect label="Instrucción académica" field="academicInstruction" value={form.academicInstruction} onChange={(v) => setField("academicInstruction", v)} />
                          <EditText label="Credencial" value={form.guardCredentials} onChange={(v) => setField("guardCredentials", v)} />
                          <EditText label="Fecha de contratación" value={form.hiringContractDate} onChange={(v) => setField("hiringContractDate", v)} type="date" />
                        </>
                      ) : (
                        <>
                          <ReadField label="Género" value={sup.gender} />
                          <ReadField label="Tipo de sangre" value={sup.bloodType} />
                          <ReadField label="Estado civil" value={sup.maritalStatus} />
                          <ReadField label="Instrucción académica" value={sup.academicInstruction} />
                          <ReadField label="Credencial" value={sup.guardCredentials} />
                          <ReadField label="Fecha de contratación" value={fmtDate(sup.hiringContractDate)} />
                        </>
                      )}
                    </div>
                  </Section>

                  <Section title="Horario / Turno" icon={<CalendarClock className="h-4 w-4" />}>
                    <p className="text-sm text-muted-foreground">
                      El horario del supervisor proviene del <span className="font-medium text-foreground">puesto</span> al que está asignado — la rotación (día/noche) se configura en el puesto, no aquí.
                    </p>
                    <a href="/supervisor-positions" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
                      <MapPin className="h-4 w-4" /> Puestos de supervisor
                    </a>
                  </Section>
                </div>

                {/* SIDEBAR (1/3) */}
                <div className="space-y-6">
                  <Section title="Operación" icon={<Car className="h-4 w-4" />}>
                    <div className="space-y-4">
                      {editing ? (
                        <>
                          <EditText label="Zona / posición (p. ej. Aguila2)" value={form.zone} onChange={(v) => setField("zone", v)} />
                          <EditText label="Vehículo asignado" value={form.assignedVehicle} onChange={(v) => setField("assignedVehicle", v)} />
                        </>
                      ) : (
                        <>
                          <ReadField label="Zona / posición" value={sup.zone} />
                          <ReadField label="Vehículo asignado" value={sup.assignedVehicle} />
                        </>
                      )}
                    </div>
                  </Section>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Supervisor no encontrado</div>
          )}
        </div>
      </GuardsLayout>
    </AppLayout>
  );
}
