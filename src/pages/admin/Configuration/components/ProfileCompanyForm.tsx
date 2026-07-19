"use client";

// Best-effort IANA timezone from a country name/code or free-text address.
const COUNTRY_TZ: Record<string, string> = {
  ecuador: "America/Guayaquil", ec: "America/Guayaquil",
  colombia: "America/Bogota", co: "America/Bogota",
  peru: "America/Lima", "perú": "America/Lima", pe: "America/Lima",
  mexico: "America/Mexico_City", "méxico": "America/Mexico_City", mx: "America/Mexico_City",
  panama: "America/Panama", "panamá": "America/Panama", pa: "America/Panama",
  chile: "America/Santiago", cl: "America/Santiago",
  argentina: "America/Buenos_Aires", ar: "America/Buenos_Aires",
  venezuela: "America/Caracas", ve: "America/Caracas",
  bolivia: "America/La_Paz", bo: "America/La_Paz",
  spain: "Europe/Madrid", "españa": "Europe/Madrid", es: "Europe/Madrid",
};
function tzFromText(...vals: (string | undefined)[]): string | null {
  const hay = vals.filter(Boolean).join(" ").toLowerCase();
  if (!hay) return null;
  for (const key of Object.keys(COUNTRY_TZ)) {
    if (hay.includes(key)) return COUNTRY_TZ[key];
  }
  return null;
}

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
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Edit,
  Search,
  Building2,
  MapPin,
  Clock,
  FileText,
} from "lucide-react";
import { Section } from "@/components/kit";
import { useAuth } from "@/contexts/AuthContext";
import tenantService from '@/services/tenant.service';
import { invalidateTenantBranding } from '@/lib/tenantBranding';
import AddressAutocomplete, { AddressComponents } from "@/components/maps/AddressAutocomplete";
import GoogleMapEmbed from "@/components/GoogleMap/GoogleMapEmbed";
import CompanyDocumentsSection, { CompanyDocument } from "./profile/documents/CompanyDocumentsSection";
import TenantJoinModal from "@/components/TenantJoinModal";
import { validateCedulaOrRuc } from '@/lib/validators/id';
import { cacheTenantLocation } from '@/utils/tenantLocation';

// useEffect imported above

export default function ProfileCompanyForm() {
  const { user } = useAuth();
  const { t } = useTranslation();

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showAddressAutocomplete, setShowAddressAutocomplete] = useState(true);
  const [autocompleteOpenQuery, setAutocompleteOpenQuery] = useState('');
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
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

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
    setLogoFile(f);
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
          // website is optional: only include when non-empty
          // this prevents sending an empty string which some backends treat as a required field
          ...(form.website && String(form.website).trim() ? { website: form.website } : {}),
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
        cacheTenantLocation(payload.latitude, payload.longitude);
        toast.success('Datos de la empresa guardados correctamente');
      } catch (err: any) {
        console.error('Error guardando tenant:', err);
        toast.error('Error al guardar datos de la empresa: ' + (err?.message || ''));
      }
    })();
  };

  // Auto-upload logo when user selects a file for an existing tenant
  useEffect(() => {
    if (!logoFile || !resolvedTenantId) return;
    let cancelled = false;
    (async () => {
      if (uploadingLogo) return;
      setUploadingLogo(true);
      try {
        await tenantService.uploadLogo(logoFile, String(resolvedTenantId));
        if (cancelled) return;
        // Logo changed -> bust the sidebar branding cache so it re-resolves.
        invalidateTenantBranding();
        toast.success('Logo subido correctamente');
        // Refresh tenant to get new logoUrl for preview
        try {
          const res: any = await tenantService.findById(String(resolvedTenantId));
          const t = (res && (res.data || res.tenant)) ? (res.data || res.tenant) : res;
          if (t) {
            const settingsLogoUrl = Array.isArray(t.settings) ? (t.settings[0] && t.settings[0].logoUrl) : (t.settings && (t.settings.logoUrl || t.settings[0]?.logoUrl));
            setLogo(t.logoUrl || settingsLogoUrl || null);
          }
        } catch (e) {
          // ignore
        }
        setLogoFile(null);
      } catch (err: any) {
        if (!cancelled) toast.error('No se pudo subir el logo: ' + (err?.message || ''));
      } finally {
        setUploadingLogo(false);
      }
    })();
    return () => { cancelled = true; };
  }, [logoFile, resolvedTenantId]);

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

        // Keep the business location cache in sync
        cacheTenantLocation((t as any).latitude, (t as any).longitude);

        if (t.phone) setPhoneE164(String(t.phone));

        // Set existing logo preview if available
        try {
          const settingsLogoUrl = Array.isArray(t.settings) ? (t.settings[0] && t.settings[0].logoUrl) : (t.settings && (t.settings.logoUrl || t.settings[0]?.logoUrl));
          const existingLogo = t.logoUrl || settingsLogoUrl || (t.logo && t.logo.downloadUrl);
          if (existingLogo) setLogo(String(existingLogo));
        } catch (e) {
          // ignore
        }

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
        const q = form.address + ' Ecuador';
        const google = (window as any).google;
        if (!google?.maps) return;
        const geocoder = new google.maps.Geocoder();
        const results: any[] = await new Promise((resolve) => {
          geocoder.geocode({ address: q, region: 'ec' }, (res: any, status: string) => {
            resolve(status === 'OK' ? res : []);
          });
        });
        if (cancelled) return;
        if (Array.isArray(results) && results.length > 0) {
          const best = results[0];
          const loc = best.geometry?.location;
          const comps: Record<string, string> = {};
          (best.address_components || []).forEach((c: any) =>
            c.types.forEach((tp: string) => { comps[tp] = c.long_name; })
          );
          setForm((s) => ({
            ...s,
            latitude: String(loc.lat()),
            longitude: String(loc.lng()),
            address: best.formatted_address || s.address,
            city: comps.locality || comps.administrative_area_level_2 || comps.sublocality_level_1 || s.city,
            postalCode: comps.postal_code || s.postalCode,
            country: comps.country || s.country,
          }));
          toast?.success?.('Coordenadas encontradas para la dirección');
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
          <div className="max-w-2xl mx-auto cg-card p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary [&_svg]:size-6">
              <Building2 />
            </div>
            <h3 className="text-lg font-medium mb-2">Debe crear una Empresa</h3>
            <p className="text-sm text-foreground/70 mb-4">Aún no tiene una empresa asignada. Cree una para continuar configurando la información.</p>
            <div className="flex justify-center">
              {/* Opens the real join/create flow — the old navigate('/tenant/create')
                  pointed at a route that doesn't exist (dead-end 404). */}
              <Button variant="brand" onClick={() => setCreateCompanyOpen(true)}>
                Crear Empresa
              </Button>
            </div>
          </div>
          <TenantJoinModal open={createCompanyOpen} onOpenChange={setCreateCompanyOpen} />
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
                <Building2 className="h-10 w-10 text-muted-foreground" />
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
            <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
              Sólo los usuarios con el rol <strong>admin</strong> pueden editar la información de la empresa.
            </div>
          )}

          <Section title="Datos de la empresa" icon={<Building2 />} contentClassName="grid grid-cols-1 gap-6">
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
              onBlur={(e) => {
                const v = (e.target as HTMLInputElement).value || '';
                const digits = v.replace(/\D/g, '');
                if (digits && digits.length > 0) {
                  if (digits.length !== 13 || !validateCedulaOrRuc(digits)) {
                    toast.error(t('clients.validation.ruc_invalid'));
                  }
                }
              }}
              placeholder="RUC de la empresa"
              maxLength={13}
              disabled={!canEdit}
            />
          </div>
          </Section>

          <Section title="Ubicación" icon={<MapPin />} contentClassName="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Dirección de la Empresa*</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddressAutocomplete(!showAddressAutocomplete)}
                disabled={!canEdit}
                className={`flex items-center gap-2 ${!canEdit ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Edit className="h-4 w-4" />
                <span>{showAddressAutocomplete ? 'Ingresar dirección manualmente' : 'Volver a búsqueda automática'}</span>
              </Button>
            </div>


            {showAddressAutocomplete && canEdit ? (
              <>
                <div style={{ position: 'relative', zIndex: 0 }}>
                  <AddressAutocomplete
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
                      // deduplicated toast
                      import.meta.env && null; // placeholder to keep linters happy
                      // eslint-disable-next-line @typescript-eslint/no-var-requires
                      //const { toastOnce } = require('@/lib/toastOnce');
                      toast.success('Dirección completada automáticamente');
                    }}
                    defaultValue={form.address || ''}
                    initialLat={form.latitude && !isNaN(Number(form.latitude)) ? Number(form.latitude) : undefined}
                    initialLng={form.longitude && !isNaN(Number(form.longitude)) ? Number(form.longitude) : undefined}
                    openWithQuery={autocompleteOpenQuery}
                    placeholder="Buscar dirección..."
                    // Mostrar mapa integrado como fuente única de ubicación
                    showMap={true}
                    mapHeight="320px"
                  />
                </div>
              </>
            ) : null}

            {/* Mostrar el mapa solo si el usuario puede editar. Si no hay lat/lng usar coordenadas por defecto de Ecuador */}
            {canEdit && !showAddressAutocomplete && (
              <div style={{ marginTop: 16, position: 'relative', zIndex: 0 }}>
                {(() => {
                  const defaultLat = -1.831239; // centro aproximado de Ecuador
                  const defaultLng = -78.183406;
                  const latVal = form.latitude && !isNaN(Number(form.latitude)) ? Number(form.latitude) : defaultLat;
                  const lngVal = form.longitude && !isNaN(Number(form.longitude)) ? Number(form.longitude) : defaultLng;
                    return (
                      <GoogleMapEmbed
                        lat={latVal}
                        lng={lngVal}
                        zoom={form.latitude && form.longitude ? 17 : 6}
                        height="320px"
                        draggable={true}
                        onMarkerMove={(lat: number, lng: number, address: string, addressDetails?: any) => {
                          setForm((s) => ({
                            ...s,
                            latitude: String(lat),
                            longitude: String(lng),
                            address: address || s.address,
                            city: (addressDetails && (addressDetails.locality || addressDetails.administrative_area_level_2 || addressDetails.administrative_area_level_1)) || s.city,
                            postalCode: (addressDetails && addressDetails.postal_code) || s.postalCode,
                            country: (addressDetails && addressDetails.country) || s.country,
                          }));
                        }}
                      />
                    );
                })()}
              </div>
            )}

            {/* Manual Address Fields */}
            <div style={{ position: 'relative', zIndex: 2000 }}>
              {showAddressAutocomplete && canEdit && (
                <p className="text-xs text-muted-foreground mb-2">Los campos manuales están bloqueados. Haz clic en "Ingresar dirección manualmente" para modificarlos.</p>
              )}
            
            <div className={showAddressAutocomplete && canEdit ? 'opacity-60 pointer-events-none' : ''}>
              <div className="space-y-4">
                <div>
                  <Label>Dirección Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.address}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      placeholder="Dirección"
                      disabled={!canEdit || showAddressAutocomplete}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      title="Buscar con autocompletado"
                      onClick={() => {
                        setAutocompleteOpenQuery(form.address || '');
                        setShowAddressAutocomplete(true);
                      }}
                      disabled={!canEdit}
                      className="flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      <span>Buscar</span>
                    </Button>
                  </div>
                </div>

                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label>Dirección Complementaria</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                placeholder="Opcional"
                disabled={!canEdit}
              />
            </div>

            <div className={showAddressAutocomplete && canEdit ? 'opacity-60 pointer-events-none' : ''}>
              <div className="space-y-4">
                <div>
                  <Label>Dirección Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.address}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      placeholder="Dirección"
                      disabled={!canEdit || showAddressAutocomplete}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      title="Buscar con autocompletado"
                      onClick={() => {
                        setAutocompleteOpenQuery(form.address || '');
                        setShowAddressAutocomplete(true);
                      }}
                      disabled={!canEdit}
                      className="flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      <span>Buscar</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Código Postal</Label>
                    <Input
                      value={form.postalCode}
                      onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                      placeholder="Código postal"
                      disabled={!canEdit || showAddressAutocomplete}
                    />
                  </div>

                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                      placeholder="Ciudad"
                      disabled={!canEdit || showAddressAutocomplete}
                    />
                  </div>

                  <div>
                    <Label>País</Label>
                    <Input
                      value={form.country}
                      onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                      placeholder="País"
                      disabled={!canEdit || showAddressAutocomplete}
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
                      disabled={!canEdit || showAddressAutocomplete}
                    />
                  </div>

                  <div>
                    <Label>Longitud</Label>
                    <Input
                      value={form.longitude}
                      onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                      placeholder="-180 a 180"
                      disabled={!canEdit || showAddressAutocomplete}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </Section>

          <Section title="Contacto y registro" icon={<FileText />} contentClassName="grid grid-cols-1 gap-6">
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
          </Section>

          <Section title="Zona horaria" icon={<Clock />} contentClassName="grid grid-cols-1 gap-6">
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
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  const tz = tzFromText(form.country, form.address);
                  if (tz) {
                    setForm((s) => ({ ...s, timezone: tz }));
                    toast.success(`Zona horaria detectada por la dirección: ${tz}`);
                  } else {
                    toast.info("No se pudo detectar la zona horaria; selecciónala manualmente.");
                  }
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Detectar por dirección
              </button>
            )}
            <p className="text-xs text-muted-foreground">La zona horaria es la <strong>única fuente de verdad</strong> para los horarios: determina cómo se muestran y calculan turnos, registros y reportes — para todos (administradores y vigilantes), sin importar la zona del dispositivo.</p>
          </div>
          </Section>

          <div className="flex justify-end">
            <Button
              variant="brand"
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
