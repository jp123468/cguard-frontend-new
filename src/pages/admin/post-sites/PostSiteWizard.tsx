/**
 * PostSiteWizard — multi-step creation flow for Sitio de Servicio
 *
 * Steps:
 *  1  Tipo de servicio      — service-type card picker
 *  2  Sitio & Ubicación     — client, address, description
 *  3  Configuración         — type-specific config + custom equipment / training
 *  4  Horario & Contacto    — schedule, hours, phone, email
 *  5  Resumen & Crear       — review → POST → inline station builder
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Plus, X, Trash2,
  Shield, BellElectric, Camera, Car, Lock, Tag,
  Users, Clock, MapPin, Phone, Mail, Building2,
  Loader2, Check, Star, Zap, AlertTriangle, Radio,
  Navigation2, Globe, Hash, ChevronDown, ChevronUp, Edit3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { stationService } from '@/lib/api/stationService';
import { ApiService } from '@/services/api/apiService';
import { ServiceTypePicker } from '@/components/post-sites/ServiceTypeBadge';
import { ServiceTypeBadge } from '@/components/post-sites/ServiceTypeBadge';
import AddressAutocomplete, { AddressComponents } from '@/components/maps/AddressAutocomplete';
import { useClientSelection } from '@/contexts/ClientSelectionContext';
import { getServiceType, SERVICE_TYPES } from '@/lib/serviceTypes';

// ─── types ────────────────────────────────────────────────────────────────────

export type WizardClient = { id: string; name: string };

interface WizardProps {
  clients?: WizardClient[];
}

interface StationDraft {
  name: string;
  description: string;
  schedule: string;
  guardsCount: string;
  startTime: string;
  endTime: string;
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const STEP_LABELS = ['Tipo', 'Sitio', 'Config.', 'Horario', 'Crear'];
const SCHEDULES = ['1 hora', '4 horas', '8 horas', '10 horas', '12 horas', '14 horas', '16 horas', '24 horas'];

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, BellAlert: BellElectric, Camera, Car, Lock,
};

// ─── CheckboxGroup with custom-item support ───────────────────────────────────

interface ChipGroupProps {
  options: { value: string; label: string }[];
  value: string[];
  customItems: string[];
  onChange: (selected: string[], custom: string[]) => void;
  placeholder?: string;
}

function ChipGroup({ options, value, customItems, onChange, placeholder = 'Agregar personalizado…' }: ChipGroupProps) {
  const [input, setInput] = useState('');

  const toggleKnown = (v: string) => {
    onChange(
      value.includes(v) ? value.filter((x) => x !== v) : [...value, v],
      customItems,
    );
  };

  const addCustom = () => {
    const trimmed = input.trim();
    if (!trimmed || customItems.includes(trimmed)) return;
    onChange(value, [...customItems, trimmed]);
    setInput('');
  };

  const removeCustom = (item: string) => {
    onChange(value, customItems.filter((x) => x !== item));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleKnown(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                checked
                  ? 'border-amber-400 bg-amber-100 text-amber-800 shadow-sm'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-amber-300 hover:bg-amber-50',
              )}
            >
              {checked && <Check className="h-3 w-3 shrink-0" />}
              {opt.label}
            </button>
          );
        })}
        {customItems.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium"
          >
            <Tag className="h-3 w-3 shrink-0" />
            {item}
            <button type="button" onClick={() => removeCustom(item)} className="ml-0.5 hover:text-red-600 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Custom add row */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!input.trim()}
          className="flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Agregar
        </button>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                done  ? 'border-green-500 bg-green-500 text-white'
                      : active ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'border-gray-200 bg-white text-gray-400',
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : idx}
              </div>
              <span className={cn(
                'hidden sm:block text-[10px] font-medium leading-none',
                active ? 'text-amber-700' : done ? 'text-green-600' : 'text-gray-400',
              )}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className={cn(
                'h-0.5 flex-1 rounded transition-all duration-500',
                idx < current ? 'bg-green-400' : 'bg-gray-200',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Station mini-form ────────────────────────────────────────────────────────

function StationRow({
  draft,
  onChange,
  onRemove,
}: {
  draft: StationDraft;
  onChange: (d: Partial<StationDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nombre de la estación *"
            className="font-medium"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Input
        value={draft.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Descripción (opcional)"
        className="text-sm"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Jornada</label>
          <select
            value={draft.schedule}
            onChange={(e) => onChange({ schedule: e.target.value })}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-0 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Sin definir</option>
            {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Guardias</label>
          <Input
            type="number"
            min={1}
            value={draft.guardsCount}
            onChange={(e) => onChange({ guardsCount: e.target.value })}
            placeholder="1"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Inicio</label>
          <Input
            value={draft.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            placeholder="08:00"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Fin</label>
          <Input
            value={draft.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            placeholder="20:00"
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function PostSiteWizard({ clients = [] }: WizardProps) {
  const navigate = useNavigate();
  const { selectedClient } = useClientSelection();

  // ── form state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [savingStations, setSavingStations] = useState(false);

  // Step 1
  const [serviceType, setServiceType] = useState<string | undefined>(undefined);

  // Step 2
  const [clientId, setClientId] = useState(selectedClient?.id ? String(selectedClient.id) : '');
  const [address, setAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [description, setDescription] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(false);

  // Step 3: service config — stored as flat map, custom items tracked separately
  const [serviceConfig, setServiceConfig] = useState<Record<string, any>>({});
  // equipment
  const [equipment, setEquipment] = useState<string[]>([]);
  const [customEquipment, setCustomEquipment] = useState<string[]>([]);
  // training
  const [training, setTraining] = useState<string[]>([]);
  const [customTraining, setCustomTraining] = useState<string[]>([]);

  // Step 4
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fax, setFax] = useState('');
  const [schedule, setSchedule] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Step 5: stations
  const [stations, setStations] = useState<StationDraft[]>([]);

  // Auto-inject client from context
  useEffect(() => {
    if (selectedClient?.id) setClientId(String(selectedClient.id));
  }, [selectedClient]);

  // ── step validation ──────────────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 2) return !!address.trim();
    return true; // other steps are optional-ish
  };

  // ── service config helpers ───────────────────────────────────────────────────
  const cfgSet = (key: string, val: any) =>
    setServiceConfig((prev) => ({ ...prev, [key]: val }));
  const cfgGet = (key: string, fallback: any = '') =>
    serviceConfig[key] ?? fallback;

  // ── address autocomplete handler ─────────────────────────────────────────────
  const handleAddressSelect = (ac: AddressComponents) => {
    setAddress(ac.address);
    setCity(ac.city);
    setCountry(ac.country);
    setPostalCode(ac.postalCode);
    setLatitud(String(ac.latitude));
    setLongitud(String(ac.longitude));
    if (ac.address || ac.city) {
      setAddressConfirmed(true);
    }
  };

  // ── build payload ────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const client = clients.find((c) => c.id === clientId);
    const autoName = address.trim() || (client ? `Sitio de ${client.name}` : 'Sitio sin nombre');

    const finalConfig = {
      ...serviceConfig,
      specialEquipment: [...equipment, ...customEquipment],
      trainingRequired: [...training, ...customTraining],
    };

    return {
      name: autoName,
      companyName: autoName,
      clientId: clientId || undefined,
      description,
      address,
      addressLine2,
      city,
      country,
      postalCode,
      latitud,
      longitud,
      email,
      phone,
      fax,
      serviceType,
      serviceConfig: finalConfig,
      stationSchedule: schedule || undefined,
      startingTimeInDay: startTime,
      finishTimeInDay: endTime,
      status,
    };
  };

  // ── submit site ──────────────────────────────────────────────────────────────
  const handleCreateSite = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const data = await stationService.create(payload as any);
      const newId = data.id || (data as any).data?.id;
      setCreatedId(newId);
      toast.success('Puesto de vigilancia creado');
      setStep(6); // station step
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al crear el sitio');
    } finally {
      setSubmitting(false);
    }
  };

  // ── submit stations ──────────────────────────────────────────────────────────
  const handleSaveStations = async () => {
    const toCreate = stations.filter((s) => s.name.trim());
    if (toCreate.length === 0) {
      navigate(`/post-sites/${createdId}/profile`);
      return;
    }
    setSavingStations(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || '';
      await Promise.all(
        toCreate.map((s) =>
          ApiService.post(`/tenant/${tenantId}/station`, {
            data: {
              stationName: s.name.trim(),
              description: s.description,
              postSiteId: createdId,
              stationSchedule: s.schedule || undefined,
              numberOfGuardsInStation: s.guardsCount || '1',
              startingTimeInDay: s.startTime,
              finishTimeInDay: s.endTime,
            },
          }),
        ),
      );
      toast.success(`${toCreate.length} estación${toCreate.length > 1 ? 'es' : ''} creada${toCreate.length > 1 ? 's' : ''}`);
    } catch (e: any) {
      toast.error('Algunas estaciones no se crearon');
    } finally {
      setSavingStations(false);
      navigate(`/post-sites/${createdId}/profile`);
    }
  };

  const addStationDraft = () => {
    setStations((prev) => [
      ...prev,
      { name: '', description: '', schedule: '', guardsCount: '1', startTime: '', endTime: '' },
    ]);
  };

  const updateStation = (i: number, delta: Partial<StationDraft>) => {
    setStations((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...delta } : s)));
  };

  const removeStation = (i: number) => {
    setStations((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── selected client label ────────────────────────────────────────────────────
  const selectedClientLabel = clients.find((c) => c.id === clientId)?.name ?? null;

  // ── equipment / training option lists ────────────────────────────────────────
  const equipmentOptions = [
    { value: 'radio', label: 'Radio comunicador' },
    { value: 'metalDetector', label: 'Detector de metales' },
    { value: 'flashlight', label: 'Linterna táctica' },
    { value: 'vehicle', label: 'Vehículo asignado' },
    { value: 'bodycam', label: 'Bodycam' },
    { value: 'baton', label: 'Bastón' },
    { value: 'handcuffs', label: 'Esposas' },
    { value: 'gloves', label: 'Guantes anticorte' },
    { value: 'firstAidKit', label: 'Botiquín de primeros auxilios' },
    { value: 'umbrella', label: 'Impermeable / paraguas' },
    { value: 'torch', label: 'Linterna de búsqueda' },
    { value: 'binoculars', label: 'Binoculares' },
  ];

  const trainingOptions = [
    { value: 'firstAid', label: 'Primeros auxilios' },
    { value: 'crowdControl', label: 'Control de multitudes' },
    { value: 'firearms', label: 'Manejo de armas' },
    { value: 'evacuation', label: 'Evacuación' },
    { value: 'accessControl', label: 'Control de acceso' },
    { value: 'cctv', label: 'Circuito cerrado (CCTV)' },
    { value: 'customerService', label: 'Servicio al cliente' },
    { value: 'defensiveTactics', label: 'Tácticas defensivas' },
    { value: 'fireExtinguisher', label: 'Manejo de extintores' },
    { value: 'panicProtocol', label: 'Protocolo antipánico' },
    { value: 'communication', label: 'Comunicación por radio' },
    { value: 'reportWriting', label: 'Redacción de informes' },
  ];

  // ── render step content ───────────────────────────────────────────────────────
  const renderStep = () => {
    // ── Step 6: Stations (post-creation) ──────────────────────────────────────
    if (step === 6) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2 pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">¡Sitio creado exitosamente!</h2>
            <p className="text-sm text-gray-500">
              Ahora puedes añadir estaciones (puestos de guardia) dentro de este sitio, o hacerlo más tarde.
            </p>
          </div>

          <div className="space-y-3">
            {stations.map((s, i) => (
              <StationRow
                key={i}
                draft={s}
                onChange={(d) => updateStation(i, d)}
                onRemove={() => removeStation(i)}
              />
            ))}

            <button
              type="button"
              onClick={addStationDraft}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-amber-300 hover:text-amber-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir estación
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/post-sites/${createdId}/profile`)}
              disabled={savingStations}
            >
              Omitir por ahora
            </Button>
            <Button
              type="button"
              onClick={handleSaveStations}
              disabled={savingStations}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {savingStations ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>
              ) : stations.filter(s => s.name.trim()).length > 0 ? (
                `Guardar ${stations.filter(s => s.name.trim()).length} estación${stations.filter(s => s.name.trim()).length > 1 ? 'es' : ''} y terminar`
              ) : 'Ir al sitio'}
            </Button>
          </div>
        </div>
      );
    }

    // ── Step 1: Service type ───────────────────────────────────────────────────
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-gray-900">¿Qué tipo de servicio es este sitio?</h2>
            <p className="text-sm text-gray-500">
              Esto nos permite preparar los campos de configuración adecuados. Puede cambiar después.
            </p>
          </div>
          <ServiceTypePicker
            value={serviceType ?? null}
            onChange={(v) => setServiceType(v)}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setServiceType(undefined); setStep(2); }}
              className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors"
            >
              Continuar sin seleccionar tipo
            </button>
          </div>
        </div>
      );
    }

    // ── Step 2: Site info + address ────────────────────────────────────────────
    if (step === 2) {
      const selectedClientObj = clients.find((c) => c.id === clientId);
      const coordsLabel = latitud && longitud
        ? `${Number(latitud).toFixed(5)}, ${Number(longitud).toFixed(5)}`
        : null;

      return (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-0.5">Ubicación del sitio</h2>
            <p className="text-sm text-gray-500">Busca la dirección en el mapa y asigna el sitio a un cliente.</p>
          </div>

          {/* ── Client selector — card style ─────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100">
                <Building2 className="h-4 w-4 text-amber-700" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</span>
            </div>
            <div className="px-4 py-3">
              {selectedClientObj ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {selectedClientObj.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{selectedClientObj.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClientId('')}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="h-3 w-3" /> Cambiar
                  </button>
                </div>
              ) : (
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— Seleccionar cliente —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* ── Map hero block ──────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
            <div className="px-4 pt-4 pb-0">
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                defaultValue={address}
                placeholder="Buscar calle, número, ciudad, lugar…"
                showMap
                mapHeight="300px"
                initialLat={latitud ? Number(latitud) : undefined}
                initialLng={longitud ? Number(longitud) : undefined}
                suppressInitialReverse
              />
            </div>
          </div>

          {/* ── Address confirmation card — appears after selection ─── */}
          {addressConfirmed && (address || city) && (
            <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 shadow-sm">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900 leading-snug">
                    {address || city}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {city && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <Globe className="h-3 w-3" />
                        {[city, country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {postalCode && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <Hash className="h-3 w-3" />
                        CP {postalCode}
                      </span>
                    )}
                    {coordsLabel && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-mono">
                        <Navigation2 className="h-3 w-3" />
                        {coordsLabel}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressFields((v) => !v)}
                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 transition-colors shrink-0"
                >
                  <Edit3 className="h-3 w-3" />
                  Editar
                  {showAddressFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Collapsible manual fields */}
              {showAddressFields && (
                <div className="border-t border-green-200 bg-white/70 px-4 py-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle y número" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
                      <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apto., piso, referencia…" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
                      <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Código postal</label>
                      <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Latitud</label>
                        <Input value={latitud} onChange={(e) => setLatitud(e.target.value)} placeholder="0.000000" className="font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Longitud</label>
                        <Input value={longitud} onChange={(e) => setLongitud(e.target.value)} placeholder="0.000000" className="font-mono text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback: show bare fields if no address confirmed yet */}
          {!addressConfirmed && address && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle y número" />
              </div>
            </div>
          )}

          {/* ── Description ─────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción del sitio</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción general, indicaciones especiales…"
              rows={3}
            />
          </div>
        </div>
      );
    }

    // ── Step 3: Config (equipment / training + type-specific) ─────────────────
    if (step === 3) {
      const typeDef = serviceType ? getServiceType(serviceType) : null;

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Configuración operativa
              {typeDef && (
                <span className="ml-2 text-base font-normal text-amber-700">— {typeDef.label}</span>
              )}
            </h2>
            <p className="text-sm text-gray-500">Equipamiento, capacitación y parámetros del servicio.</p>
          </div>

          {/* Equipment */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Equipamiento</h3>
            </div>
            <ChipGroup
              options={equipmentOptions}
              value={equipment}
              customItems={customEquipment}
              onChange={(sel, cust) => { setEquipment(sel); setCustomEquipment(cust); }}
              placeholder="Agregar otro equipo…"
            />
          </div>

          {/* Training */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <Star className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Capacitación requerida</h3>
            </div>
            <ChipGroup
              options={trainingOptions}
              value={training}
              customItems={customTraining}
              onChange={(sel, cust) => { setTraining(sel); setCustomTraining(cust); }}
              placeholder="Agregar otra capacitación…"
            />
          </div>

          {/* Type-specific deployment fields */}
          {(serviceType === 'manned' || serviceType === 'patrol' || serviceType === 'custody') && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Users className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Despliegue</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estaciones requeridas</label>
                  <Input
                    type="number" min={1}
                    placeholder="Ej. 2"
                    value={cfgGet('stationsRequired')}
                    onChange={(e) => cfgSet('stationsRequired', e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nivel de riesgo</label>
                  <select
                    value={cfgGet('riskLevel')}
                    onChange={(e) => cfgSet('riskLevel', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Seleccionar…</option>
                    {[['low','Bajo'],['medium','Medio'],['high','Alto'],['critical','Crítico']].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Servicio armado</label>
                  <button
                    type="button"
                    onClick={() => cfgSet('armedService', !cfgGet('armedService', false))}
                    className={cn(
                      'flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
                      cfgGet('armedService', false)
                        ? 'border-amber-400 bg-amber-100 text-amber-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    <span className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center', cfgGet('armedService', false) ? 'border-amber-500 bg-amber-500' : 'border-gray-400')}>
                      {cfgGet('armedService', false) && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    Guardia armado
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Uniforme requerido</label>
                  <button
                    type="button"
                    onClick={() => cfgSet('uniformRequired', !cfgGet('uniformRequired', true))}
                    className={cn(
                      'flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
                      cfgGet('uniformRequired', true)
                        ? 'border-amber-400 bg-amber-100 text-amber-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    <span className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center', cfgGet('uniformRequired', true) ? 'border-amber-500 bg-amber-500' : 'border-gray-400')}>
                      {cfgGet('uniformRequired', true) && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    Uniforme obligatorio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SOP field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Instrucciones del puesto (SOP)
            </label>
            <Textarea
              placeholder="Protocolo de acceso, manejo de visitantes, emergencias, comunicación con supervisores…"
              rows={3}
              value={cfgGet('postInstructions')}
              onChange={(e) => cfgSet('postInstructions', e.target.value)}
            />
          </div>
        </div>
      );
    }

    // ── Step 4: Schedule + contact ─────────────────────────────────────────────
    if (step === 4) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Horario y contacto</h2>
            <p className="text-sm text-gray-500">Configure la jornada de servicio y datos de contacto del sitio.</p>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-200 text-gray-600">
                <Clock className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Horario de servicio</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Jornada de guardia</label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sin definir</option>
                  {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hora de inicio</label>
                <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="08:00" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hora de fin</label>
                <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="20:00" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-200 text-gray-600">
                <Phone className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Contacto del sitio</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Correo electrónico</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono de contacto</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fax / Teléfono fijo</label>
                <Input value={fax} onChange={(e) => setFax(e.target.value)} placeholder="+1 555 000 0001" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado inicial</label>
                <div className="flex gap-2">
                  {(['active', 'inactive'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        'flex-1 h-9 rounded-md border text-sm font-medium transition-colors',
                        status === s
                          ? s === 'active' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-400 bg-gray-100 text-gray-600'
                          : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300',
                      )}
                    >
                      {s === 'active' ? 'Activo' : 'Inactivo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Step 5: Review & Create ────────────────────────────────────────────────
    if (step === 5) {
      const typeDef = serviceType ? getServiceType(serviceType) : null;
      const allEquip = [...equipment, ...customEquipment];
      const allTraining = [...training, ...customTraining];

      const SummaryRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) =>
        value ? (
          <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
            <span className="mt-0.5 text-amber-600 shrink-0">{icon}</span>
            <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value}</span>
          </div>
        ) : null;

      return (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Revisar y crear</h2>
            <p className="text-sm text-gray-500">Comprueba la información antes de crear el puesto de vigilancia.</p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {typeDef && (
              <div className={cn('flex items-center gap-3 px-5 py-3', typeDef.color)}>
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', typeDef.color, typeDef.textColor)}>
                  {React.createElement(SERVICE_ICONS[typeDef.icon] ?? Shield, { className: 'h-4 w-4' })}
                </span>
                <span className={cn('text-sm font-semibold', typeDef.textColor)}>{typeDef.label}</span>
              </div>
            )}
            <div className="px-5 py-4 space-y-0">
              <SummaryRow icon={<Building2 className="h-4 w-4" />} label="Cliente" value={selectedClientLabel ?? undefined} />
              <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Dirección" value={address || undefined} />
              <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Ciudad" value={city || undefined} />
              <SummaryRow icon={<Clock className="h-4 w-4" />} label="Jornada" value={schedule || undefined} />
              <SummaryRow icon={<Clock className="h-4 w-4" />} label="Horario" value={startTime && endTime ? `${startTime} – ${endTime}` : undefined} />
              <SummaryRow icon={<Phone className="h-4 w-4" />} label="Teléfono" value={phone || undefined} />
              <SummaryRow icon={<Mail className="h-4 w-4" />} label="Correo" value={email || undefined} />
            </div>
          </div>

          {/* Equipment & training chips */}
          {(allEquip.length > 0 || allTraining.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allEquip.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Equipamiento
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allEquip.map((e) => {
                      const opt = equipmentOptions.find((o) => o.value === e);
                      return (
                        <span key={e} className="text-[11px] bg-white border border-amber-200 text-amber-800 rounded-full px-2 py-0.5">
                          {opt?.label ?? e}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {allTraining.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-2 flex items-center gap-1">
                    <Star className="h-3 w-3" /> Capacitación
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTraining.map((t) => {
                      const opt = trainingOptions.find((o) => o.value === t);
                      return (
                        <span key={t} className="text-[11px] bg-white border border-amber-200 text-amber-800 rounded-full px-2 py-0.5">
                          {opt?.label ?? t}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ── nav ────────────────────────────────────────────────────────────────────
  const isLastMainStep = step === 5;
  const isStationStep = step === 6;
  const TOTAL_MAIN_STEPS = 5;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar (only on main steps) */}
      {!isStationStep && (
        <div className="mb-8">
          <StepBar current={step} total={TOTAL_MAIN_STEPS} />
        </div>
      )}

      {/* Content */}
      <div className="min-h-[420px]">
        {renderStep()}
      </div>

      {/* Navigation footer (not shown on station step — has own buttons) */}
      {!isStationStep && (
        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (step === 1) navigate('/post-sites');
              else setStep((s) => s - 1);
            }}
            className="gap-1.5 text-gray-600"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Button>

          {isLastMainStep ? (
            <Button
              type="button"
              onClick={handleCreateSite}
              disabled={submitting || !address.trim()}
              className="bg-[#C8860A] text-white hover:bg-[#B37809] gap-2 min-w-36"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Crear Sitio</>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext()}
              className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
