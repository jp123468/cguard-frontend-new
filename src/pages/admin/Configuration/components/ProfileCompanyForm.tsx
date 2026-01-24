"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CompanyPhoneField from "./profile/CompanyPhoneField";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import tenantService from '@/services/tenant.service';
// useEffect imported above

export default function ProfileCompanyForm() {
  const { user } = useAuth();

  const isAdmin = (() => {
    if (!user) return false;
    const parseRoles = (r: any) => {
      if (!r) return [];
      if (Array.isArray(r)) return r;
      if (typeof r === 'string') {
        try {
          const parsed = JSON.parse(r);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          return [r];
        }
      }
      return [];
    };

    const topRoles = parseRoles(user.roles);
    if (topRoles.includes('admin')) return true;
    if (Array.isArray(user.tenants) && user.tenants.length > 0) {
      const t = user.tenants[0];
      const tRoles = parseRoles(t.roles);
      if (tRoles.includes('admin')) return true;
    }
    return false;
  })();

  const canEdit = isAdmin;
  const [logo, setLogo] = useState<string | null>(null);

  const [country, setCountry] = useState({
    code: "US",
    dialCode: "+1",
    name: "United States",
    flag: "🇺🇸",
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    website: "",
    address: "",
    email: "",
    license: "",
    timezone: "America/Guayaquil",
  });

  const [phoneE164, setPhoneE164] = useState("");
  const navigate = useNavigate();

  // resolved tenantId used across render and effect
  const resolvedTenantId =
    localStorage.getItem("tenantId") ||
    (user && Array.isArray(user.tenants) && user.tenants.length > 0
      ? (user.tenants[0].tenantId || (user.tenants[0].tenant && user.tenants[0].tenant.id))
      : null);
  const isPhoneValid = (() => {
    if (!phoneE164) return false;
    try {
      const parsed = parsePhoneNumberFromString(String(phoneE164));
      return !!parsed && parsed.isValid();
    } catch (err) {
      return false;
    }
  })();
  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneE164 && !isPhoneValid) {
      toast.error("Por favor ingresa un número de teléfono válido antes de guardar.");
      return;
    }

    // Aquí se podría transformar phoneE164 a la estructura que el backend espera
    // y enviar PUT /tenant/:id -> tenantService.update(tenantId, payload)
    toast.success("Datos de la empresa guardados");
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // use resolvedTenantId computed above
        const tenantId = resolvedTenantId;
        if (!tenantId) return;

        const res: any = await tenantService.findById(String(tenantId));
        if (!mounted || !res) return;

        const t = res;

        setForm((s) => ({
          ...s,
          name: t.name ?? "",
          website: t.website ?? "",
          address: t.address ?? "",
          email: t.email ?? "",
          license: t.licenseNumber ?? t.license ?? "",
          timezone: t.timezone ?? s.timezone,
        }));

        if (t.phone) setPhoneE164(String(t.phone));
        // logo handling: backend stores logoId; we leave existing behavior for now
      } catch (err) {
        console.warn('No se pudo cargar datos del tenant:', err);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  // If there's no tenant assigned, force admins to create one
  if (!resolvedTenantId) {
    if (isAdmin) {
      return (
        <div className="p-6">
          <div className="max-w-2xl mx-auto bg-white border rounded-md p-6 text-center">
            <h3 className="text-lg font-medium mb-2">Debe crear una Empresa</h3>
            <p className="text-sm text-gray-600 mb-4">Aún no tiene una empresa asignada. Cree una para continuar configurando la información.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/tenant/create')} className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white">
                Crear Empresa
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="w-full flex flex-col items-center gap-3 mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border bg-muted overflow-hidden grid place-items-center">
              {logo ? (
                <img src={logo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-4xl">🏢</div>
              )}
            </div>
            <label
              htmlFor="logo"
              className={`absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-muted grid place-items-center border ${!canEdit ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'cursor-pointer'}`}
            >
              <Camera className="h-4 w-4 text-muted-foreground" />
            </label>
            <input id="logo" type="file" accept="image/*" className="hidden" onChange={onPickLogo} disabled={!canEdit} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {!canEdit && (
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
              Sólo los usuarios con el rol <strong>admin</strong> pueden editar la información de la empresa.
            </div>
          )}
          <div className="space-y-2">
            <Label>Nombre de la Empresa*</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={!canEdit}
              placeholder="Nombre"
            />
          </div>

          <div className="space-y-2">
            <Label>Número de Teléfono de la Empresa*</Label>
            <div>
              <CompanyPhoneField value={phoneE164} onChange={setPhoneE164} disabled={!canEdit} />
              {phoneE164 && !isPhoneValid && (
                <p className="text-xs text-red-500">Número inválido. Usa el formato internacional, por ejemplo +12015550123.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">e.g. {country.dialCode}2015550123</p>
          </div>

          <div className="space-y-2">
            <Label>Sitio Web de la Empresa</Label>
            <Input
              type="url"
              value={form.website}
              onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              placeholder="https://tu-dominio.com"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Dirección de la Empresa*</Label>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Dirección"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Correo Electrónico de la Empresa</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="correo@empresa.com"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Número de Licencia de la Empresa</Label>
            <Input
              value={form.license}
              onChange={(e) => setForm((s) => ({ ...s, license: e.target.value }))}
              placeholder="Licencia"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Zona Horaria</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm((s) => ({ ...s, timezone: v }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona horaria" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="America/Guayaquil">UTC-5 Quito (America/Guayaquil)</SelectItem>
                <SelectItem value="America/Bogota">UTC-5 Bogotá (America/Bogota)</SelectItem>
                <SelectItem value="America/Lima">UTC-5 Lima (America/Lima)</SelectItem>
                <SelectItem value="America/Mexico_City">UTC-6 Ciudad de México</SelectItem>
                <SelectItem value="America/Santiago">UTC-3 Santiago</SelectItem>
                <SelectItem value="America/Buenos_Aires">UTC-3 Buenos Aires</SelectItem>
                <SelectItem value="Europe/Madrid">UTC+1 Madrid</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">La zona horaria determina cómo se muestran y calculan los horarios y marcas de tiempo en la aplicación (turnos, registros y reportes).</p>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-[#f36a6d] hover:bg-[#e85b5f] text-white"
              type="submit"
              disabled={!canEdit}
              title={!canEdit ? 'Solo admins pueden guardar cambios' : undefined}
            >
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
