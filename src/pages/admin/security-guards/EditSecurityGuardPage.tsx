import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import securityGuardService from "@/lib/api/securityGuardService";
import Breadcrumb from "@/components/ui/breadcrumb";
import { usePermissions } from '@/hooks/usePermissions';

export default function EditSecurityGuardPage() {
  // Deduplicate toasts across component remounts (React StrictMode may mount twice)
  // Use a module-scoped Set to avoid showing the same toast multiple times.
  // Keys used below: 'edit-guard-not-found' and 'edit-guard-general-error'
  const shownToasts = useRef<Set<string>>(new Set());

  function showToastOnce(key: string, message: string) {
    if (shownToasts.current.has(key)) return;
    shownToasts.current.add(key);
    toast.error(message);
  }
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (!hasPermission('securityGuardEdit')) {
      if (!toastAndRedirected.current) {
        toastAndRedirected.current = true;
        toast.error('No tienes permiso para editar guardias');
        navigate('/security-guards');
      }
    }
  }, [hasPermission, navigate]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const toastAndRedirected = useRef(false);
  const generalErrorShown = useRef(false);
  const hasFetched = useRef(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    birthDate: "",
    birthPlace: "",
    maritalStatus: "",
    bloodType: "",
    academicInstruction: "",
    hiringContractDate: "",
    gender: "",
    governmentId: "",
    guardCredentials: "",
  });
  const [fetchedData, setFetchedData] = useState<any>(null);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const data = await securityGuardService.get(id);
        setFetchedData(data);
        const g = data.guard ?? data;
        setForm({
          firstName: g.firstName ?? "",
          lastName: g.lastName ?? "",
          email: g.email ?? "",
          phoneNumber: g.phoneNumber ?? "",
          address: data.address ?? "",
          birthDate: data.birthDate ?? "",
          birthPlace: data.birthPlace ?? "",
          maritalStatus: data.maritalStatus ?? "",
          bloodType: data.bloodType ?? "",
          academicInstruction: data.academicInstruction ?? "",
          hiringContractDate: data.hiringContractDate ?? "",
          gender: data.gender ?? "",
          governmentId: data.governmentId ?? "",
          guardCredentials: data.guardCredentials ?? "",
        });
      } catch (err: any) {
        let msg = err?.message || err;
        if (
          !toastAndRedirected.current &&
          (err?.response?.status === 404 || (typeof msg === 'string' && msg.toLowerCase().includes('extraviado')))
        ) {
          toastAndRedirected.current = true;
          setRedirecting(true);
          setError(null);
          setForm({
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            address: "",
            birthDate: "",
            birthPlace: "",
            maritalStatus: "",
            bloodType: "",
            academicInstruction: "",
            hiringContractDate: "",
            gender: "",
            governmentId: "",
            guardCredentials: "",
          });
          showToastOnce('edit-guard-not-found', "No se encontró el guardia solicitado.");
          navigate('/security-guards', { replace: true });
        } else if (!generalErrorShown.current) {
          generalErrorShown.current = true;
          let details = '';
          if (err?.response) {
            details = JSON.stringify(err.response, null, 2);
          } else if (err?.stack) {
            details = err.stack;
          }
          showToastOnce('edit-guard-general-error', `Error cargando guardia: ${msg}`);
          setError(`Error cargando guardia: ${msg}${details ? '\n' + details : ''}`);
          setRedirecting(true);
          navigate('/security-guards', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    })();
    // Limpiar la ref al desmontar
    return () => {
      toastAndRedirected.current = false;
      generalErrorShown.current = false;
      hasFetched.current = false;
    };
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // Merge fetched raw data with only the changed fields from the form so we don't
        // accidentally overwrite server fields that the form doesn't include.
        const base = fetchedData ? { ...fetchedData } : {};

        // Update top-level fields from form
        base.address = form.address ?? base.address;
        base.birthDate = form.birthDate ?? base.birthDate;
        base.birthPlace = form.birthPlace ?? base.birthPlace;
        base.maritalStatus = form.maritalStatus ?? base.maritalStatus;
        base.bloodType = form.bloodType ?? base.bloodType;
        base.academicInstruction = form.academicInstruction ?? base.academicInstruction;
        base.hiringContractDate = form.hiringContractDate ?? base.hiringContractDate;
        base.gender = form.gender ?? base.gender;
        base.governmentId = form.governmentId ?? base.governmentId;
        base.guardCredentials = form.guardCredentials ?? base.guardCredentials;

        // Ensure nested guard object exists and update its fields
        base.guard = { ...(base.guard || {}) };
        base.guard.firstName = form.firstName ?? base.guard.firstName;
        base.guard.lastName = form.lastName ?? base.guard.lastName;
        // prefer explicit email/phoneNumber from form
        if (typeof form.email === "string") base.guard.email = form.email;
        if (typeof form.phoneNumber === "string") base.guard.phoneNumber = form.phoneNumber;

        await securityGuardService.update(id!, base);
        navigate("/security-guards");
      } catch (err: any) {
        const msg = err?.message || String(err);
        toast.error("Error guardando cambios: " + msg);
      } finally {
        setLoading(false);
      }
    })();
  }

  if (redirecting) return null;

  return (
    <AppLayout>
      <div className="p-6 w-full">
        <Breadcrumb
          items={[
            { label: "Panel de control", path: "/dashboard" },
            { label: "Editar guardia" },
          ]}
          className="mb-4"
        />
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-xl border">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <Input name="firstName" value={form.firstName} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apellidos *</label>
            <Input name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Correo Electrónico *</label>
            <Input name="email" value={form.email} onChange={handleChange} required type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono *</label>
            <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <Input name="address" value={form.address} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de nacimiento</label>
            <Input name="birthDate" value={form.birthDate} onChange={handleChange} type="date" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lugar de nacimiento</label>
            <Input name="birthPlace" value={form.birthPlace} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado civil</label>
            <Input name="maritalStatus" value={form.maritalStatus} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de sangre</label>
            <Input name="bloodType" value={form.bloodType} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instrucción académica</label>
            <Input name="academicInstruction" value={form.academicInstruction} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contrato</label>
            <Input name="hiringContractDate" value={form.hiringContractDate} onChange={handleChange} type="date" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Género</label>
            <Input name="gender" value={form.gender} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cédula</label>
            <Input name="governmentId" value={form.governmentId} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Guard Credentials</label>
            <Input name="guardCredentials" value={form.guardCredentials} onChange={handleChange} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              Guardar cambios
            </Button>
          </div>
          {/* error display removed per UX request; errors now shown via toast */}
        </form>
      </div>
    </AppLayout>
  );
}
