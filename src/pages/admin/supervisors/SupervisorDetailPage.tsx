import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Save } from "lucide-react";
import { PageContainer, PageHeader, Section, SkeletonCards, StatusBadge } from "@/components/kit";
import { supervisorService, type Supervisor } from "@/lib/api/supervisorService";

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
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    supervisorService
      .get(id)
      .then((s) => {
        setSup(s);
        const init: Record<string, any> = {};
        for (const f of FIELDS) init[f.key as string] = (s as any)[f.key] ?? "";
        setForm(init);
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
