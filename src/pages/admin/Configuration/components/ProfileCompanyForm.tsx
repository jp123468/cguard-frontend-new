"use client";

import { useState, useEffect, useCallback } from "react";
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
import AddressAutocompleteOSM, { AddressComponents } from "@/components/maps/AddressAutocompleteOSM";
import OSMMapEmbed from "@/components/maps/OSMMapEmbed";
import CompanyDocumentsSection, { CompanyDocument } from "./profile/documents/CompanyDocumentsSection";

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
  const [showAddressAutocomplete, setShowAddressAutocomplete] = useState(true);
  const [showBillingAddressAutocomplete, setShowBillingAddressAutocomplete] = useState(true);
  // State for company legal documents
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
    billingAddress: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    country: "",
    latitude: "",
    longitude: "",
    email: "",
    license: "",
    ruc: "",
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

    (async () => {
      try {
        const tenantId = resolvedTenantId;
        if (!tenantId) throw new Error('Tenant no definido');

        const payload: any = {
          name: form.name,
          website: form.website,
          address: form.address,
          billingAddress: form.billingAddress,
          addressLine2: form.addressLine2,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
          latitude: form.latitude && form.latitude !== '' ? parseFloat(form.latitude) : null,
          longitude: form.longitude && form.longitude !== '' ? parseFloat(form.longitude) : null,
          email: form.email,
          licenseNumber: form.license,
          taxNumber: form.ruc,
          timezone: form.timezone,
          phone: phoneE164 || null,
        };

        await tenantService.update(String(tenantId), payload);
        toast.success('Datos de la empresa guardados correctamente');
      } catch (err: any) {
        console.error('Error guardando tenant:', err);
        toast.error('Error al guardar datos de la empresa: ' + (err?.message || ''));
      }
    })();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantId = resolvedTenantId;
        if (!tenantId) return;

        const res: any = await tenantService.findById(String(tenantId));
        if (!mounted || !res) return;

        // Normalize response shape: some endpoints return { data: tenant } or { tenant: {...} }
        const t = (res && (res.data || res.tenant)) ? (res.data || res.tenant) : res;
        console.debug('Loaded tenant (normalized):', t, 'rawResponse:', res);

        setForm((s) => ({
          ...s,
          name: t.name ?? "",
          website: t.website ?? "",
          address: t.address ?? "",
          billingAddress: t.billingAddress ?? "",
          addressLine2: (t as any).addressLine2 ?? "",
          city: (t as any).city ?? "",
          postalCode: (t as any).postalCode ?? "",
          country: (t as any).country ?? "",
          latitude: (t as any).latitude ? String((t as any).latitude) : "",
          longitude: (t as any).longitude ? String((t as any).longitude) : "",
          email: t.email ?? "",
          license: t.licenseNumber ?? t.license ?? "",
          ruc: t.taxNumber ?? t.ruc ?? "",
          timezone: t.timezone ?? s.timezone,
        }));

        if (t.phone) setPhoneE164(String(t.phone));

        // Load company legal documents if present
        if (Array.isArray(t.legalDocuments)) {
          setCompanyDocuments(
            t.legalDocuments.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              url: doc.downloadUrl || doc.publicUrl || '',
              type: doc.type || doc.mimeType || '',
            }))
          );
        } else {
          setCompanyDocuments([]);
        }
      } catch (err) {
        console.warn('No se pudo cargar datos del tenant:', err);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  // Geocode form.address to lat/lng when address changes and coordinates are missing
  useEffect(() => {
    let cancelled = false;
    let timer: any;
    const shouldGeocode = form.address && (!form.latitude || !form.longitude || form.latitude === '' || form.longitude === '');
    if (!shouldGeocode) return;

    // debounce to avoid many requests while typing
    timer = setTimeout(async () => {
      try {
        const q = encodeURIComponent(form.address + ' Ecuador');
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ec&q=${q}&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const best = data[0];
          setForm((s) => ({
            ...s,
            latitude: String(best.lat),
            longitude: String(best.lon),
            address: best.display_name || s.address,
            city: best.address && (best.address.city || best.address.town || best.address.village) ? (best.address.city || best.address.town || best.address.village) : s.city,
            postalCode: best.address && (best.address.postcode || '') ? (best.address.postcode || s.postalCode) : s.postalCode,
            country: best.address && best.address.country ? best.address.country : s.country,
          }));
          toast && toast.success && toast.success('Coordenadas encontradas para la dirección');
        }
      } catch (err) {
        // ignore
      }
    }, 700);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.address]);
  // Handler to upload a new legal document
  const handleUploadDocument = useCallback(async (file: File) => {
    if (!resolvedTenantId) return;
    setUploadingDoc(true);
    try {
      await tenantService.uploadLegalDocument(file, String(resolvedTenantId));
      toast.success('Documento subido correctamente');
      // Refresh document list
      const res: any = await tenantService.findById(String(resolvedTenantId));
      if (Array.isArray(res.legalDocuments)) {
        setCompanyDocuments(
          res.legalDocuments.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            url: doc.downloadUrl || doc.publicUrl || '',
            type: doc.type || doc.mimeType || '',
          }))
        );
      }
    } catch (err: any) {
      toast.error('Error al subir documento: ' + (err?.message || ''));
    } finally {
      setUploadingDoc(false);
    }
  }, [resolvedTenantId]);

  // Handler to delete a document (future implementation)
  const handleDeleteDocument = useCallback(async (id: string) => {
    // TODO: Implement backend endpoint and logic for deleting a document
    toast.info('Funcionalidad de eliminación pendiente');
  }, []);

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
            <Label>RUC (Registro Único de Contribuyentes)</Label>
            <Input
              value={form.ruc}
              onChange={(e) => setForm((s) => ({ ...s, ruc: e.target.value }))}
              placeholder="RUC de la empresa"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Dirección de la Empresa*</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddressAutocomplete(!showAddressAutocomplete)}
                disabled={!canEdit}
              >
                {showAddressAutocomplete ? 'Entrada manual' : 'Búsqueda automática'}
              </Button>
            </div>


            {showAddressAutocomplete && canEdit ? (
              <>
                <AddressAutocompleteOSM
                  onAddressSelect={(addressData: AddressComponents) => {
                    setForm((s) => ({
                      ...s,
                      address: addressData.address,
                      city: addressData.city,
                      postalCode: addressData.postalCode,
                      country: addressData.country,
                      latitude: String(addressData.latitude),
                      longitude: String(addressData.longitude),
                    }));
                    toast.success('Dirección completada automáticamente');
                  }}
                  defaultValue={form.address || ''}
                  placeholder="Buscar dirección..."
                  showMap={false}
                  mapHeight="0px"
                />
              </>
            ) : null}

            {/* Mostrar el mapa solo si el usuario puede editar. Si no hay lat/lng usar coordenadas por defecto de Ecuador */}
            {canEdit && (
              <div style={{ marginTop: 16 }}>
                {(() => {
                  const defaultLat = -1.831239; // centro aproximado de Ecuador
                  const defaultLng = -78.183406;
                  const latVal = form.latitude && !isNaN(Number(form.latitude)) ? Number(form.latitude) : defaultLat;
                  const lngVal = form.longitude && !isNaN(Number(form.longitude)) ? Number(form.longitude) : defaultLng;
                    return (
                      <OSMMapEmbed
                        lat={latVal}
                        lng={lngVal}
                        zoom={form.latitude && form.longitude ? 17 : 6}
                        height="320px"
                        onMarkerMove={(lat: number, lng: number, address: string, addressDetails?: any) => {
                          setForm((s) => ({
                            ...s,
                            latitude: String(lat),
                            longitude: String(lng),
                            address: address || s.address,
                            city: (addressDetails && (addressDetails.city || addressDetails.town || addressDetails.village)) || s.city,
                            postalCode: (addressDetails && addressDetails.postcode) || s.postalCode,
                            country: (addressDetails && addressDetails.country) || s.country,
                          }));
                        }}
                      />
                    );
                })()}
              </div>
            )}

            {/* Manual Address Fields */}
            <div className={showAddressAutocomplete && canEdit ? 'opacity-60 pointer-events-none' : ''}>
              <div className="space-y-4">
                <div>
                  <Label>Dirección Principal</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                    placeholder="Dirección"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <Label>Dirección Complementaria</Label>
                  <Input
                    value={form.addressLine2}
                    onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                    placeholder="Opcional"
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Código Postal</Label>
                    <Input
                      value={form.postalCode}
                      onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                      placeholder="Código postal"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                      placeholder="Ciudad"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>País</Label>
                    <Input
                      value={form.country}
                      onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                      placeholder="País"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Latitud</Label>
                    <Input
                      value={form.latitude}
                      onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
                      placeholder="-90 a 90"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>Longitud</Label>
                    <Input
                      value={form.longitude}
                      onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                      placeholder="-180 a 180"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </div>
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

        <div className="mt-6">
          <CompanyDocumentsSection
            documents={companyDocuments}
            onUpload={handleUploadDocument}
            onDelete={handleDeleteDocument}
            canEdit={canEdit && !uploadingDoc}
          />
        </div>
      </form>
    </>
  );
}
