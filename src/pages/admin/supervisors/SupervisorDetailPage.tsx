import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarClock, Car, MapPin, Building2, User as UserIcon,
  Pencil, Mail, Phone, Check,
} from "lucide-react";
import { supervisorService, type Supervisor } from "@/lib/api/supervisorService";
import { stationService } from "@/lib/api/stationService";

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
  const [turnoDays, setTurnoDays] = useState<number[]>([]);
  const [turnoStart, setTurnoStart] = useState("");
  const [turnoEnd, setTurnoEnd] = useState("");
  const [assigned, setAssigned] = useState<string[]>([]);
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);

  const setField = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const toggleDay = (n: number) => setTurnoDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));
  const toggleStation = (sid: string) => setAssigned((a) => (a.includes(sid) ? a.filter((x) => x !== sid) : [...a, sid]));

  const hydrate = (s: Supervisor) => {
    setSup(s);
    setForm({
      governmentId: s.governmentId ?? "", birthDate: toDateInput(s.birthDate), birthPlace: s.birthPlace ?? "",
      address: s.address ?? "", gender: s.gender ?? "", bloodType: s.bloodType ?? "", maritalStatus: s.maritalStatus ?? "",
      academicInstruction: s.academicInstruction ?? "", guardCredentials: s.guardCredentials ?? "",
      hiringContractDate: toDateInput(s.hiringContractDate), zone: s.zone ?? "", assignedVehicle: s.assignedVehicle ?? "",
    });
    setTurnoDays(Array.isArray(s.turnoDays) ? s.turnoDays : []);
    setTurnoStart(s.turnoStart || "");
    setTurnoEnd(s.turnoEnd || "");
    setAssigned(Array.isArray(s.assignedStationIds) ? s.assignedStationIds : []);
  };

  const load = useCallback(() => {
    setLoading(true);
    supervisorService.get(id)
      .then(hydrate)
      .catch(() => toast.error("No se pudo cargar el supervisor"))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    stationService.list({}, { limit: 300, offset: 0 })
      .then((r) => setStations((r.rows || []).map((s: any) => ({ id: String(s.id), name: s.name || s.companyName || "—" }))))
      .catch(() => setStations([]));
  }, []);

  const beginEdit = () => { if (sup) hydrate(sup); setEditing(true); };
  const cancelEdit = () => { if (sup) hydrate(sup); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      for (const k of Object.keys(form)) body[k] = form[k] === "" ? null : form[k];
      body.turnoDays = turnoDays.length ? turnoDays : null;
      body.turnoStart = turnoStart || null;
      body.turnoEnd = turnoEnd || null;
      body.assignedStationIds = assigned;
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
  const stationName = (sid: string) => stations.find((s) => s.id === sid)?.name || sid;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6 pb-24">
          <button onClick={() => navigate("/supervisors")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Supervisores
          </button>

          {loading ? (
            <div className="h-40 rounded-2xl border bg-card animate-pulse" />
          ) : sup ? (
            <>
              {/* ── HERO ─────────────────────────────────────────────────── */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/40 shadow-sm">
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/15 to-transparent" />
                <div className="relative p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-2xl bg-muted ring-4 ring-background overflow-hidden flex items-center justify-center shadow-md">
                      {sup.photoUrl ? (
                        <img src={sup.photoUrl} alt={sup.fullName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <UserIcon className="w-16 h-16 text-muted-foreground" />
                      )}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ring-2 ring-background ${onDuty ? "bg-green-500" : "bg-gray-400"}`} title={onDuty ? "En turno" : "Fuera de turno"} />
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h1 className="text-2xl font-bold tracking-tight truncate">{sup.fullName}</h1>
                    <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {sup.governmentId && <span>CI: <span className="font-medium text-foreground">{sup.governmentId}</span></span>}
                      {sup.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3.5 w-3.5" />{sup.email}</span>}
                      {sup.phoneNumber && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{sup.phoneNumber}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700">Supervisor</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${onDuty ? "bg-green-500/15 text-green-700" : "bg-muted text-foreground/60"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${onDuty ? "bg-green-500" : "bg-gray-400"}`} />
                        {onDuty ? (sup.dutyStatus === "late" ? `En turno (tarde ${sup.dutyLateMinutes}m)` : "En turno") : "Fuera de turno"}
                      </span>
                      {sup.zone && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground/70"><MapPin className="h-3 w-3" />{sup.zone}</span>}
                    </div>
                  </div>

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

                  <Section title="Turno del supervisor" icon={<CalendarClock className="h-4 w-4" />}>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Turno que el supervisor debe cumplir. Marca entrada/salida desde la app; la asistencia se mide contra esta ventana (llegada tarde y cierre automático).
                    </p>
                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Días</div>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((d) => {
                          const on = turnoDays.includes(d.n);
                          return (
                            <button key={d.n} type="button" disabled={!editing} onClick={() => toggleDay(d.n)}
                              className={`rounded-md border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground"} ${editing ? "hover:bg-muted" : "opacity-80 cursor-default"}`}>
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:max-w-md">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Entrada</div>
                        <Input type="time" value={turnoStart} disabled={!editing} onChange={(e) => setTurnoStart(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Salida</div>
                        <Input type="time" value={turnoEnd} disabled={!editing} onChange={(e) => setTurnoEnd(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </div>
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

                  <Section
                    title="Estaciones asignadas"
                    icon={<Building2 className="h-4 w-4" />}
                    action={<span className="text-xs text-muted-foreground">{assigned.length}</span>}
                  >
                    <p className="mb-3 text-xs text-muted-foreground">Estaciones/sitios bajo la responsabilidad de este supervisor.</p>
                    {editing ? (
                      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                        {stations.length === 0 && <p className="text-xs text-muted-foreground">Cargando estaciones…</p>}
                        {stations.map((s) => {
                          const on = assigned.includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => toggleStation(s.id)}
                              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${on ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                              <span className={`grid h-4 w-4 place-items-center rounded ${on ? "bg-primary text-primary-foreground" : "border border-border"}`}>{on && <Check className="h-3 w-3" />}</span>
                              <span className="truncate">{s.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : assigned.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assigned.map((sid) => (
                          <span key={sid} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            <Building2 className="h-3 w-3" />{stationName(sid)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin estaciones asignadas. Usa “Editar” para asignar.</p>
                    )}
                  </Section>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Supervisor no encontrado</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
