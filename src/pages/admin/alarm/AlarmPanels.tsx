import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RadioTower,
  ShieldAlert,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  PageContainer,
  PageHeader,
  StatCard,
  Stagger,
  EmptyState,
} from "@/components/kit";

import {
  alarmService,
  type AlarmComms,
  type AlarmContact,
  type AlarmContactAuthority,
  type AlarmPanel,
  type AlarmPanelStatus,
  type AlarmPanelType,
  type AlarmProtocol,
  type AlarmZone,
  type AlarmZoneType,
} from "@/lib/api/alarmService";
import { videoService, type Camera } from "@/lib/api/videoService";

const GOLD = "#C8860A";

// ============================================================
// Option labels (Spanish UI)
// ============================================================

const PROTOCOL_OPTS: AlarmProtocol[] = [
  "sia-dc09",
  "contactid",
  "surgard",
  "webhook",
  "manual",
];
const PROTOCOL_LABELS: Record<AlarmProtocol, string> = {
  "sia-dc09": "SIA DC-09",
  contactid: "Contact ID",
  surgard: "Sur-Gard",
  webhook: "Webhook",
  manual: "Manual",
};

const PANEL_TYPE_OPTS: AlarmPanelType[] = [
  "intrusion",
  "fire",
  "holdup",
  "access",
  "environmental",
];
const PANEL_TYPE_LABELS: Record<AlarmPanelType, string> = {
  intrusion: "Intrusión",
  fire: "Incendio",
  holdup: "Atraco",
  access: "Acceso",
  environmental: "Ambiental",
};

const COMMS_OPTS: AlarmComms[] = ["ip", "cellular", "dual"];
const COMMS_LABELS: Record<AlarmComms, string> = {
  ip: "IP",
  cellular: "Celular",
  dual: "Dual",
};

const STATUS_LABELS: Record<AlarmPanelStatus, string> = {
  online: "En línea",
  offline: "Sin conexión",
  armed: "Armado",
  disarmed: "Desarmado",
  unknown: "Desconocido",
};

const ZONE_TYPE_OPTS: AlarmZoneType[] = [
  "entry",
  "perimeter",
  "motion",
  "glassbreak",
  "smoke",
  "panic",
  "tamper",
  "supervisory",
];
const ZONE_TYPE_LABELS: Record<AlarmZoneType, string> = {
  entry: "Entrada/Salida",
  perimeter: "Perímetro",
  motion: "Movimiento",
  glassbreak: "Rotura de cristal",
  smoke: "Humo",
  panic: "Pánico",
  tamper: "Sabotaje",
  supervisory: "Supervisión",
};

const AUTHORITY_OPTS: AlarmContactAuthority[] = [
  "owner",
  "manager",
  "keyholder",
  "emergency",
];
const AUTHORITY_LABELS: Record<AlarmContactAuthority, string> = {
  owner: "Propietario",
  manager: "Gerente",
  keyholder: "Responsable de llaves",
  emergency: "Emergencia",
};

// ============================================================
// Status badge
// ============================================================

function StatusBadge({ status }: { status?: AlarmPanelStatus }) {
  const s = status ?? "unknown";
  if (s === "online") {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <Wifi className="h-3 w-3" /> {STATUS_LABELS.online}
      </Badge>
    );
  }
  if (s === "armed") {
    return (
      <Badge className="gap-1 border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
        <ShieldAlert className="h-3 w-3" /> {STATUS_LABELS.armed}
      </Badge>
    );
  }
  if (s === "disarmed") {
    return (
      <Badge className="gap-1 border-transparent bg-sky-100 text-sky-700 hover:bg-sky-100">
        <Wifi className="h-3 w-3" /> {STATUS_LABELS.disarmed}
      </Badge>
    );
  }
  if (s === "offline") {
    return (
      <Badge className="gap-1 border-transparent bg-red-100 text-red-700 hover:bg-red-100">
        <WifiOff className="h-3 w-3" /> {STATUS_LABELS.offline}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <WifiOff className="h-3 w-3" /> {STATUS_LABELS.unknown}
    </Badge>
  );
}

// ============================================================
// Panel form
// ============================================================

interface PanelForm {
  name: string;
  protocol: AlarmProtocol;
  accountNumber: string;
  panelType: AlarmPanelType;
  comms: AlarmComms;
  receiverLine: string;
  dc09Key: string;
  supervisionMins: string;
  testIntervalHrs: string;
  make: string;
  model: string;
  psapAgency: string;
  psapPhone: string;
  asapOri: string;
  postSiteId: string;
  stationId: string;
  customerId: string;
  notes: string;
}

const emptyPanelForm = (): PanelForm => ({
  name: "",
  protocol: "sia-dc09",
  accountNumber: "",
  panelType: "intrusion",
  comms: "ip",
  receiverLine: "",
  dc09Key: "",
  supervisionMins: "0",
  testIntervalHrs: "",
  make: "",
  model: "",
  psapAgency: "",
  psapPhone: "",
  asapOri: "",
  postSiteId: "",
  stationId: "",
  customerId: "",
  notes: "",
});

/** PSAP/ASAP fields present on the API payload but not on the base AlarmPanel model. */
type AlarmPanelWithPsap = AlarmPanel & { psapAgency?: string | null; psapPhone?: string | null; asapOri?: string | null };

const panelToForm = (p: AlarmPanel): PanelForm => ({
  name: p.name ?? "",
  protocol: (p.protocol as AlarmProtocol) ?? "sia-dc09",
  accountNumber: p.accountNumber ?? "",
  panelType: (p.panelType as AlarmPanelType) ?? "intrusion",
  comms: (p.comms as AlarmComms) ?? "ip",
  receiverLine: p.receiverLine ?? "",
  // dc09Key is never returned by the API; always start blank on edit.
  dc09Key: "",
  supervisionMins: p.supervisionMins != null ? String(p.supervisionMins) : "0",
  testIntervalHrs: p.testIntervalHrs != null ? String(p.testIntervalHrs) : "",
  make: p.make ?? "",
  model: p.model ?? "",
  psapAgency: (p as AlarmPanelWithPsap).psapAgency ?? "",
  psapPhone: (p as AlarmPanelWithPsap).psapPhone ?? "",
  asapOri: (p as AlarmPanelWithPsap).asapOri ?? "",
  postSiteId: p.postSiteId ?? "",
  stationId: p.stationId ?? "",
  customerId: p.customerId ?? "",
  notes: p.notes ?? "",
});

// Small native select styled like the app's inputs.
function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      className={
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
        "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
        (className ?? "")
      }
      {...rest}
    />
  );
}

// ============================================================
// Panel create/edit modal (portaled)
// ============================================================

function PanelModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: AlarmPanel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PanelForm>(emptyPanelForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editing ? panelToForm(editing) : emptyPanelForm());
  }, [open, editing]);

  if (!open) return null;

  const set = <K extends keyof PanelForm>(k: K, v: PanelForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num = (s: string): number | null => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const payload: Partial<AlarmPanel> & { dc09Key?: string; psapAgency?: string | null; psapPhone?: string | null; asapOri?: string | null } = {
      name: form.name.trim(),
      protocol: form.protocol,
      accountNumber: form.accountNumber.trim() || null,
      panelType: form.panelType,
      comms: form.comms,
      receiverLine: form.receiverLine.trim() || null,
      supervisionMins: num(form.supervisionMins) ?? 0,
      testIntervalHrs: num(form.testIntervalHrs),
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      psapAgency: form.psapAgency.trim() || null,
      psapPhone: form.psapPhone.trim() || null,
      asapOri: form.asapOri.trim() || null,
      postSiteId: form.postSiteId.trim() || null,
      stationId: form.stationId.trim() || null,
      customerId: form.customerId.trim() || null,
      notes: form.notes.trim() || null,
    };
    // Only send the AES key when provided (never overwrite with empty on edit).
    if (form.dc09Key.trim()) payload.dc09Key = form.dc09Key.trim();

    setSaving(true);
    try {
      if (editing) {
        await alarmService.updatePanel(editing.id, payload);
        toast.success("Panel actualizado");
      } else {
        await alarmService.createPanel(payload);
        toast.success("Panel agregado");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo guardar el panel");
    } finally {
      setSaving(false);
    }
  };

  const showDc09Key = form.protocol === "sia-dc09";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {editing ? "Editar panel" : "Agregar panel"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configura la conexión del panel de alarma con la central receptora.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ap-name">Nombre *</Label>
              <Input
                id="ap-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Sucursal Centro - Panel principal"
                required
              />
            </div>

            <div>
              <Label htmlFor="ap-protocol">Protocolo</Label>
              <NativeSelect
                id="ap-protocol"
                value={form.protocol}
                onChange={(e) => set("protocol", e.target.value as AlarmProtocol)}
              >
                {PROTOCOL_OPTS.map((p) => (
                  <option key={p} value={p}>
                    {PROTOCOL_LABELS[p]}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label htmlFor="ap-account">Número de cuenta</Label>
              <Input
                id="ap-account"
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                placeholder="1234"
              />
            </div>

            <div>
              <Label htmlFor="ap-type">Tipo de panel</Label>
              <NativeSelect
                id="ap-type"
                value={form.panelType}
                onChange={(e) => set("panelType", e.target.value as AlarmPanelType)}
              >
                {PANEL_TYPE_OPTS.map((t) => (
                  <option key={t} value={t}>
                    {PANEL_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label htmlFor="ap-comms">Comunicación</Label>
              <NativeSelect
                id="ap-comms"
                value={form.comms}
                onChange={(e) => set("comms", e.target.value as AlarmComms)}
              >
                {COMMS_OPTS.map((c) => (
                  <option key={c} value={c}>
                    {COMMS_LABELS[c]}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label htmlFor="ap-receiverLine">Línea de receptor</Label>
              <Input
                id="ap-receiverLine"
                value={form.receiverLine}
                onChange={(e) => set("receiverLine", e.target.value)}
                placeholder="R1L1"
              />
            </div>

            <div>
              <Label htmlFor="ap-supervision">Supervisión (min)</Label>
              <Input
                id="ap-supervision"
                type="number"
                min={0}
                value={form.supervisionMins}
                onChange={(e) => set("supervisionMins", e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="ap-psapAgency">Agencia / PSAP (policía)</Label>
              <Input
                id="ap-psapAgency"
                value={form.psapAgency}
                onChange={(e) => set("psapAgency", e.target.value)}
                placeholder="Ej. Policía Nacional - Zona 9"
              />
            </div>

            <div>
              <Label htmlFor="ap-psapPhone">Teléfono PSAP</Label>
              <Input
                id="ap-psapPhone"
                value={form.psapPhone}
                onChange={(e) => set("psapPhone", e.target.value)}
                placeholder="Despacho manual"
              />
            </div>

            <div>
              <Label htmlFor="ap-asapOri">ORI ASAP (despacho automático)</Label>
              <Input
                id="ap-asapOri"
                value={form.asapOri}
                onChange={(e) => set("asapOri", e.target.value)}
                placeholder="Identificador de agencia ASAP"
              />
            </div>

            <div>
              <Label htmlFor="ap-testInterval">Intervalo de prueba (h)</Label>
              <Input
                id="ap-testInterval"
                type="number"
                min={0}
                value={form.testIntervalHrs}
                onChange={(e) => set("testIntervalHrs", e.target.value)}
                placeholder="24"
              />
            </div>

            <div>
              <Label htmlFor="ap-make">Marca</Label>
              <Input
                id="ap-make"
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
                placeholder="DSC / Honeywell..."
              />
            </div>

            <div>
              <Label htmlFor="ap-model">Modelo</Label>
              <Input
                id="ap-model"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="PowerSeries Neo"
              />
            </div>

            {showDc09Key && (
              <div className="sm:col-span-2">
                <Label htmlFor="ap-dc09Key">Clave AES DC-09 (hex)</Label>
                <Input
                  id="ap-dc09Key"
                  value={form.dc09Key}
                  onChange={(e) => set("dc09Key", e.target.value)}
                  autoComplete="off"
                  placeholder={
                    editing
                      ? "Dejar en blanco para conservar la clave actual"
                      : "Clave de cifrado en hexadecimal (opcional)"
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Solo para señales cifradas. La clave nunca se muestra una vez
                  guardada.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="ap-postSite">Punto de servicio (opcional)</Label>
              <Input
                id="ap-postSite"
                value={form.postSiteId}
                onChange={(e) => set("postSiteId", e.target.value)}
                placeholder="ID del punto de servicio"
              />
            </div>

            <div>
              <Label htmlFor="ap-station">Estación (opcional)</Label>
              <Input
                id="ap-station"
                value={form.stationId}
                onChange={(e) => set("stationId", e.target.value)}
                placeholder="ID de la estación"
              />
            </div>

            <div>
              <Label htmlFor="ap-customer">Cliente (opcional)</Label>
              <Input
                id="ap-customer"
                value={form.customerId}
                onChange={(e) => set("customerId", e.target.value)}
                placeholder="ID del cliente"
              />
            </div>

            <div className="hidden sm:block" />

            <div className="sm:col-span-2">
              <Label htmlFor="ap-notes">Notas</Label>
              <Textarea
                id="ap-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                placeholder="Instrucciones, ubicación, observaciones..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Agregar panel"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ============================================================
// Delete confirmation (portaled)
// ============================================================

function ConfirmDelete({
  open,
  title,
  message,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ============================================================
// Zones manager (inside expanded row)
// ============================================================

interface ZoneForm {
  zoneNumber: string;
  name: string;
  type: AlarmZoneType;
  partition: string;
  linkedCameraId: string;
  bypassed: boolean;
}

const emptyZoneForm = (): ZoneForm => ({
  zoneNumber: "",
  name: "",
  type: "motion",
  partition: "",
  linkedCameraId: "",
  bypassed: false,
});

function ZonesManager({ panelId }: { panelId: string }) {
  const [zones, setZones] = useState<AlarmZone[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videoService.cameras().then((c) => setCameras(Array.isArray(c) ? c : [])).catch(() => {});
  }, []);
  const cameraName = (id?: string | null) => cameras.find((c) => c.id === id)?.name || (id ? "Cámara vinculada" : "—");
  const [form, setForm] = useState<ZoneForm>(emptyZoneForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlarmZone | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await alarmService.zones(panelId);
      setZones(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudieron cargar las zonas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  const set = <K extends keyof ZoneForm>(k: K, v: ZoneForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(emptyZoneForm());
    setEditingId(null);
  };

  const startEdit = (z: AlarmZone) => {
    setEditingId(z.id);
    setForm({
      zoneNumber: z.zoneNumber ?? "",
      name: z.name ?? "",
      type: (z.type as AlarmZoneType) ?? "motion",
      partition: z.partition ?? "",
      linkedCameraId: z.linkedCameraId ?? "",
      bypassed: !!z.bypassed,
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<AlarmZone> = {
      zoneNumber: form.zoneNumber.trim() || null,
      name: form.name.trim() || null,
      type: form.type,
      partition: form.partition.trim() || null,
      linkedCameraId: form.linkedCameraId.trim() || null,
      bypassed: form.bypassed,
    };
    setSaving(true);
    try {
      if (editingId) {
        await alarmService.updateZone(editingId, payload);
        toast.success("Zona actualizada");
      } else {
        await alarmService.createZone(panelId, payload);
        toast.success("Zona agregada");
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo guardar la zona");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await alarmService.deleteZone(deleteTarget.id);
      toast.success("Zona eliminada");
      setZones((prev) => prev.filter((z) => z.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo eliminar la zona");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando zonas...
        </div>
      ) : zones.length === 0 ? (
        <div className="py-2 text-sm text-muted-foreground">
          No hay zonas configuradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Partición</th>
                <th className="px-3 py-2">Cámara</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{z.zoneNumber || "—"}</td>
                  <td className="px-3 py-2">{z.name || "—"}</td>
                  <td className="px-3 py-2">
                    {ZONE_TYPE_LABELS[(z.type as AlarmZoneType) ?? "motion"]}
                  </td>
                  <td className="px-3 py-2">{z.partition || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {cameraName(z.linkedCameraId)}
                  </td>
                  <td className="px-3 py-2">
                    {z.bypassed ? (
                      <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Anulada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Activa</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => startEdit(z)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(z)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Zone form */}
      <form
        onSubmit={onSubmit}
        className="mt-3 grid grid-cols-1 gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <Label htmlFor="z-number" className="text-xs">
            Número de zona
          </Label>
          <Input
            id="z-number"
            value={form.zoneNumber}
            onChange={(e) => set("zoneNumber", e.target.value)}
            placeholder="001"
          />
        </div>
        <div>
          <Label htmlFor="z-name" className="text-xs">
            Nombre
          </Label>
          <Input
            id="z-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Puerta principal"
          />
        </div>
        <div>
          <Label htmlFor="z-type" className="text-xs">
            Tipo
          </Label>
          <NativeSelect
            id="z-type"
            value={form.type}
            onChange={(e) => set("type", e.target.value as AlarmZoneType)}
          >
            {ZONE_TYPE_OPTS.map((t) => (
              <option key={t} value={t}>
                {ZONE_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="z-partition" className="text-xs">
            Partición
          </Label>
          <Input
            id="z-partition"
            value={form.partition}
            onChange={(e) => set("partition", e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <Label htmlFor="z-camera" className="text-xs">
            Cámara vinculada (verificación por video)
          </Label>
          <select
            id="z-camera"
            value={form.linkedCameraId}
            onChange={(e) => set("linkedCameraId", e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Sin cámara —</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>{c.name || c.id}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.bypassed}
              onChange={(e) => set("bypassed", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Anulada (bypass)
          </label>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" size="sm" variant="brand" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editingId ? "Guardar zona" : "Agregar zona"}
          </Button>
          {editingId && (
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <ConfirmDelete
        open={!!deleteTarget}
        title="Eliminar zona"
        message={`¿Seguro que deseas eliminar la zona ${deleteTarget?.name || deleteTarget?.zoneNumber || ""}? Esta acción no se puede deshacer.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

// ============================================================
// Contacts manager (inside expanded row)
// ============================================================

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  callOrder: string;
  passcode: string;
  authority: AlarmContactAuthority;
}

const emptyContactForm = (): ContactForm => ({
  name: "",
  phone: "",
  email: "",
  callOrder: "1",
  passcode: "",
  authority: "keyholder",
});

function ContactsManager({ panelId }: { panelId: string }) {
  const [contacts, setContacts] = useState<AlarmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ContactForm>(emptyContactForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlarmContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await alarmService.contacts(panelId);
      const arr = Array.isArray(list) ? list : [];
      arr.sort((a, b) => (a.callOrder ?? 0) - (b.callOrder ?? 0));
      setContacts(arr);
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudieron cargar los contactos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  const set = <K extends keyof ContactForm>(k: K, v: ContactForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(emptyContactForm());
    setEditingId(null);
  };

  const startEdit = (c: AlarmContact) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      callOrder: c.callOrder != null ? String(c.callOrder) : "1",
      // passcode is never returned by the API; always start blank on edit.
      passcode: "",
      authority: (c.authority as AlarmContactAuthority) ?? "keyholder",
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre del contacto es obligatorio");
      return;
    }
    const n = parseInt(form.callOrder, 10);
    const payload: Partial<AlarmContact> & { passcode?: string } = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      callOrder: Number.isFinite(n) ? n : 1,
      authority: form.authority,
    };
    if (form.passcode.trim()) payload.passcode = form.passcode.trim();

    setSaving(true);
    try {
      if (editingId) {
        await alarmService.updateContact(editingId, payload);
        toast.success("Contacto actualizado");
      } else {
        await alarmService.createContact(panelId, payload);
        toast.success("Contacto agregado");
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo guardar el contacto");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await alarmService.deleteContact(deleteTarget.id);
      toast.success("Contacto eliminado");
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo eliminar el contacto");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando contactos...
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-2 text-sm text-muted-foreground">
          No hay contactos de aviso configurados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Orden</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Autoridad</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{c.callOrder ?? "—"}</td>
                  <td className="px-3 py-2">{c.name || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.phone || "—"}</td>
                  <td className="px-3 py-2 text-xs">{c.email || "—"}</td>
                  <td className="px-3 py-2">
                    {c.authority
                      ? AUTHORITY_LABELS[c.authority as AlarmContactAuthority]
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => startEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact form */}
      <form
        onSubmit={onSubmit}
        className="mt-3 grid grid-cols-1 gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <Label htmlFor="c-name" className="text-xs">
            Nombre *
          </Label>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Juan Pérez"
          />
        </div>
        <div>
          <Label htmlFor="c-phone" className="text-xs">
            Teléfono
          </Label>
          <Input
            id="c-phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+52 55 1234 5678"
          />
        </div>
        <div>
          <Label htmlFor="c-email" className="text-xs">
            Email
          </Label>
          <Input
            id="c-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="contacto@empresa.com"
          />
        </div>
        <div>
          <Label htmlFor="c-order" className="text-xs">
            Orden de llamada
          </Label>
          <Input
            id="c-order"
            type="number"
            min={1}
            value={form.callOrder}
            onChange={(e) => set("callOrder", e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <Label htmlFor="c-authority" className="text-xs">
            Autoridad
          </Label>
          <NativeSelect
            id="c-authority"
            value={form.authority}
            onChange={(e) =>
              set("authority", e.target.value as AlarmContactAuthority)
            }
          >
            {AUTHORITY_OPTS.map((a) => (
              <option key={a} value={a}>
                {AUTHORITY_LABELS[a]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="c-passcode" className="text-xs">
            Código de verificación
          </Label>
          <Input
            id="c-passcode"
            value={form.passcode}
            onChange={(e) => set("passcode", e.target.value)}
            autoComplete="off"
            placeholder={editingId ? "Dejar en blanco para conservar" : "••••"}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" size="sm" variant="brand" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editingId ? "Guardar contacto" : "Agregar contacto"}
          </Button>
          {editingId && (
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <ConfirmDelete
        open={!!deleteTarget}
        title="Eliminar contacto"
        message={`¿Seguro que deseas eliminar a ${deleteTarget?.name || "este contacto"}? Esta acción no se puede deshacer.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

// ============================================================
// Expanded panel detail (zones + contacts tabs)
// ============================================================

function PanelDetail({ panelId }: { panelId: string }) {
  const [tab, setTab] = useState<"zones" | "contacts">("zones");
  return (
    <div className="border-t bg-muted/10 px-4 py-4">
      <div className="mb-3 inline-flex rounded-md border bg-background p-0.5">
        <button
          type="button"
          onClick={() => setTab("zones")}
          className={
            "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium " +
            (tab === "zones"
              ? "bg-amber-50 text-amber-900"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <RadioTower className="h-4 w-4" /> Zonas
        </button>
        <button
          type="button"
          onClick={() => setTab("contacts")}
          className={
            "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium " +
            (tab === "contacts"
              ? "bg-amber-50 text-amber-900"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <Users className="h-4 w-4" /> Contactos
        </button>
      </div>

      {tab === "zones" ? (
        <ZonesManager panelId={panelId} />
      ) : (
        <ContactsManager panelId={panelId} />
      )}
    </div>
  );
}

// ============================================================
// Page
// ============================================================

export default function AlarmPanels() {
  const [panels, setPanels] = useState<AlarmPanel[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlarmPanel | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<AlarmPanel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await alarmService.panels();
      setPanels(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudieron cargar los paneles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p: AlarmPanel) => {
    setEditing(p);
    setModalOpen(true);
  };

  const toggleExpand = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await alarmService.deletePanel(deleteTarget.id);
      toast.success("Panel eliminado");
      setPanels((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo eliminar el panel");
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const c = { total: panels.length, online: 0, offline: 0, armed: 0 };
    for (const p of panels) {
      const s = (p.status as AlarmPanelStatus) ?? "unknown";
      if (s === "online") c.online += 1;
      else if (s === "offline") c.offline += 1;
      else if (s === "armed") c.armed += 1;
    }
    return c;
  }, [panels]);

  return (
    <AppLayout>
      <PageContainer width="wide">
        {/* Header */}
        <PageHeader
          icon={<ShieldAlert />}
          title="Paneles de alarma"
          subtitle="Administra los paneles monitoreados, sus zonas y contactos de aviso."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/alarm/queue">Cola de casos</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/alarm/signals">Señales</Link>
              </Button>
              <Button variant="brand" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar panel
              </Button>
            </>
          }
        />

        {/* Summary */}
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={counts.total} icon={<ShieldAlert />} accent="slate" />
          <StatCard label="En línea" value={counts.online} icon={<Wifi />} accent="green" />
          <StatCard label="Armados" value={counts.armed} icon={<ShieldAlert />} accent="orange" />
          <StatCard label="Sin conexión" value={counts.offline} icon={<WifiOff />} accent="red" />
        </Stagger>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando paneles...
          </div>
        ) : panels.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert />}
            title="No hay paneles"
            description="Agrega tu primer panel de alarma para comenzar a recibir señales."
            action={
              <Button variant="brand" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar panel
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {panels.map((p) => {
              const isOpen = !!expanded[p.id];
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(p.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 rounded-md bg-amber-50 p-2">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5" style={{ color: GOLD }} />
                        ) : (
                          <ChevronRight
                            className="h-5 w-5"
                            style={{ color: GOLD }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold">{p.name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {PANEL_TYPE_LABELS[
                              (p.panelType as AlarmPanelType) ?? "intrusion"
                            ]}
                          </Badge>
                          {p.active === false && (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {[p.make, p.model].filter(Boolean).join(" · ") ||
                            "Sin marca/modelo"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground">
                          <span>
                            Cuenta: {p.accountNumber || "—"}
                          </span>
                          <span>
                            {PROTOCOL_LABELS[
                              (p.protocol as AlarmProtocol) ?? "sia-dc09"
                            ]}
                          </span>
                          <span>
                            {COMMS_LABELS[(p.comms as AlarmComms) ?? "ip"]}
                          </span>
                          {p.receiverLine ? <span>{p.receiverLine}</span> : null}
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={p.status as AlarmPanelStatus} />
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isOpen && <PanelDetail panelId={p.id} />}
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>

      <PanelModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        title="Eliminar panel"
        message={`¿Seguro que deseas eliminar ${deleteTarget?.name || "este panel"}? Se eliminarán también sus zonas y contactos. Esta acción no se puede deshacer.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
    </AppLayout>
  );
}
