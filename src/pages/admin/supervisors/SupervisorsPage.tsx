import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Plus, Radar, UserPlus, Car, MapPin } from "lucide-react";
import {
  PageContainer, PageHeader, Section, SkeletonCards, StatCard, StatusBadge, Modal,
} from "@/components/kit";
import { supervisorService, type Supervisor } from "@/lib/api/supervisorService";

export default function SupervisorsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "", governmentId: "", phoneNumber: "", zone: "", assignedVehicle: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    supervisorService
      .list()
      .then((r) => setRows(r.rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const onDuty = rows.filter((r) => r.isOnDuty).length;

  const submit = async () => {
    if (!form.email.trim()) {
      toast.error("El correo es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const sup = await supervisorService.create({
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        governmentId: form.governmentId.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        zone: form.zone.trim() || undefined,
        assignedVehicle: form.assignedVehicle.trim() || undefined,
      });
      toast.success("Supervisor creado y enviada la invitación");
      setOpen(false);
      setForm({ email: "", firstName: "", lastName: "", governmentId: "", phoneNumber: "", zone: "", assignedVehicle: "" });
      navigate(`/supervisors/${sup.id}`);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear el supervisor");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Supervisor & { id: string }>[] = [
    { key: "fullName", header: "Nombre", render: (_v, r) => <span className="font-medium text-foreground">{r.fullName}</span> },
    { key: "zone", header: "Zona", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.zone || "—"}</span> },
    { key: "assignedVehicle", header: "Vehículo", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.assignedVehicle || "—"}</span> },
    {
      key: "isOnDuty", header: "Estado", render: (_v, r) =>
        r.isOnDuty
          ? <StatusBadge tone="green">En turno</StatusBadge>
          : <StatusBadge tone="slate" dot={false}>Fuera</StatusBadge>,
    },
    { key: "email", header: "Correo", render: (_v, r) => <span className="text-xs text-muted-foreground">{r.email || "—"}</span> },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <PageContainer width="wide">
          <PageHeader
            icon={<ShieldCheck />}
            title="Supervisores"
            subtitle="Gestiona los supervisores de seguridad: perfil, zona, vehículo y estado en turno."
            actions={
              <Button variant="brand" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo supervisor
              </Button>
            }
          />

          <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
            <StatCard label="Supervisores" value={rows.length} icon={<ShieldCheck />} />
            <StatCard label="En turno" value={onDuty} icon={<Radar />} accent="success" />
          </div>

          <Section title="Supervisores" icon={<ShieldCheck />}>
            {loading ? (
              <SkeletonCards count={4} />
            ) : (
              <DataTable
                columns={columns}
                data={rows as (Supervisor & { id: string })[]}
                onRowClick={(r) => navigate(`/supervisors/${r.id}`)}
                emptyState={<div className="py-10 text-center text-sm text-muted-foreground">Aún no hay supervisores</div>}
              />
            )}
          </Section>
        </PageContainer>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Nuevo supervisor"
        icon={<UserPlus className="h-5 w-5" />}
        description="Crea el usuario con rol de supervisor y su perfil. Se enviará una invitación."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="brand" onClick={submit} disabled={saving}>{saving ? "Creando…" : "Crear supervisor"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="Correo *" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="sm:col-span-2" />
          <Input placeholder="Nombres" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          <Input placeholder="Apellidos" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          <Input placeholder="Cédula / ID" value={form.governmentId} onChange={(e) => setForm((f) => ({ ...f, governmentId: e.target.value }))} />
          <Input placeholder="Teléfono" value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
          <Input placeholder="Zona / sector" value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} />
          <Input placeholder="Vehículo asignado" value={form.assignedVehicle} onChange={(e) => setForm((f) => ({ ...f, assignedVehicle: e.target.value }))} />
        </div>
      </Modal>
    </AppLayout>
  );
}
