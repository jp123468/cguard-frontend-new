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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Plus, X, Trash2,
  Shield, BellElectric, Camera, Car, Lock, Tag,
  Users, Clock, MapPin, Building2,
  Loader2, Check, Star, Zap, AlertTriangle,
  Navigation2, Globe, Hash, ChevronDown, ChevronUp, Edit3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { stationService } from '@/lib/api/stationService';
import { ApiService } from '@/services/api/apiService';
import { ServiceTypePicker } from '@/components/post-sites/ServiceTypeBadge';
import AddressAutocomplete, { AddressComponents } from '@/components/maps/AddressAutocomplete';
import { useClientSelection } from '@/contexts/ClientSelectionContext';
import { getServiceType } from '@/lib/serviceTypes';

// ─── types ────────────────────────────────────────────────────────────────────

export type WizardClient = { id: string; name: string };

interface WizardProps {
  clients?: WizardClient[];
  mode?: 'create' | 'edit';
  id?: string;
}

interface JornadaDraft {
  id: string;
  nombre: string;
  tipo: 'matutina' | 'nocturna' | 'sacafranco' | 'personalizada';
  startTime: string;
  endTime: string;
  guardsCount: string;
}

interface StationDraft {
  name: string;
  description: string;
  jornadas: JornadaDraft[];
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const STEP_LABELS = ['Tipo', 'Sitio', 'Config.', 'Estaciones', 'Crear'];
const SCHEDULES = ['1 hora', '4 horas', '8 horas', '10 horas', '12 horas', '14 horas', '16 horas', '24 horas'];

const JORNADA_PRESETS: { tipo: JornadaDraft['tipo']; label: string; startTime: string; endTime: string }[] = [
  { tipo: 'matutina',     label: 'Matutina',     startTime: '06:00', endTime: '18:00' },
  { tipo: 'nocturna',     label: 'Nocturna',     startTime: '18:00', endTime: '06:00' },
  { tipo: 'sacafranco',   label: 'Sacafranco',   startTime: '06:00', endTime: '18:00' },
  { tipo: 'personalizada',label: 'Personalizada',startTime: '',      endTime: ''      },
];

const JORNADA_STYLE: Record<JornadaDraft['tipo'], { badge: string; ring: string }> = {
  matutina:     { badge: 'bg-amber-100 text-amber-800 border-amber-300',   ring: 'ring-amber-200' },
  nocturna:     { badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', ring: 'ring-indigo-200' },
  sacafranco:   { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', ring: 'ring-emerald-200' },
  personalizada:{ badge: 'bg-gray-100 text-gray-700 border-gray-300',      ring: 'ring-gray-200' },
};

const DEPLOY_CHECKS: { key: string; label: string; defaultOn?: boolean }[] = [
  { key: 'armedService',    label: 'Guardia armado' },
  { key: 'uniformRequired', label: 'Uniforme obligatorio', defaultOn: true },
  { key: 'periodicPatrol',  label: 'Patrullaje perimetral' },
  { key: 'k9Service',       label: 'Canes / K9' },
  { key: 'vehicleControl',  label: 'Control acceso vehicular' },
  { key: 'cctvMonitoring',  label: 'Monitoreo CCTV' },
  { key: 'visitorLog',      label: 'Registro de visitantes' },
  { key: 'incidentLog',     label: 'Libro de novedades' },
  { key: 'formalHandover',  label: 'Entrega de turno formal' },
  { key: 'keyCustody',      label: 'Custodia de llaves' },
  { key: 'alarmResponse',   label: 'Respuesta a alarmas' },
  { key: 'radioComms',      label: 'Comunicación por radio' },
];

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

// ─── Jornada row ─────────────────────────────────────────────────────────────

function JornadaRow({
  jornada,
  onChange,
  onRemove,
}: {
  jornada: JornadaDraft;
  onChange: (d: Partial<JornadaDraft>) => void;
  onRemove: () => void;
}) {
  const style = JORNADA_STYLE[jornada.tipo];
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border bg-white px-3 py-2 ring-1', style.ring)}>
      {/* Type badge */}
      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', style.badge)}>
        {jornada.tipo === 'sacafranco' ? 'SF' : jornada.tipo.slice(0, 3).toUpperCase()}
      </span>
      {/* Editable name */}
      <Input
        value={jornada.nombre}
        onChange={(e) => onChange({ nombre: e.target.value })}
        className="h-7 flex-1 min-w-0 text-xs font-medium border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
        placeholder="Nombre del turno"
      />
      {/* Times */}
      <div className="flex items-center gap-1 shrink-0">
        <Input
          value={jornada.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
          placeholder="HH:MM"
          className="h-7 w-16 text-[11px] font-mono text-center px-1"
        />
        <span className="text-gray-400 text-xs">→</span>
        <Input
          value={jornada.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
          placeholder="HH:MM"
          className="h-7 w-16 text-[11px] font-mono text-center px-1"
        />
      </div>
      {/* Guards */}
      <div className="flex items-center gap-1 shrink-0">
        <Users className="h-3.5 w-3.5 text-gray-400" />
        <Input
          type="number" min={1}
          value={jornada.guardsCount}
          onChange={(e) => onChange({ guardsCount: e.target.value })}
          className="h-7 w-10 text-[11px] text-center px-1"
        />
      </div>
      <button type="button" onClick={onRemove} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Station card ─────────────────────────────────────────────────────────────

function StationRow({
  draft,
  onChange,
  onRemove,
}: {
  draft: StationDraft;
  onChange: (d: Partial<StationDraft>) => void;
  onRemove: () => void;
}) {
  const addJornada = (preset: typeof JORNADA_PRESETS[number]) => {
    const j: JornadaDraft = {
      id: Math.random().toString(36).slice(2),
      nombre: preset.label,
      tipo: preset.tipo,
      startTime: preset.startTime,
      endTime: preset.endTime,
      guardsCount: '1',
    };
    onChange({ jornadas: [...draft.jornadas, j] });
  };

  const updateJornada = (id: string, delta: Partial<JornadaDraft>) => {
    onChange({ jornadas: draft.jornadas.map((j) => (j.id === id ? { ...j, ...delta } : j)) });
  };

  const removeJornada = (id: string) => {
    onChange({ jornadas: draft.jornadas.filter((j) => j.id !== id) });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Station name + delete */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nombre del puesto *"
          className="font-semibold flex-1"
        />
        <button type="button" onClick={onRemove} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <Input
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Descripción del puesto (opcional)"
          className="text-sm text-gray-500"
        />
      </div>

      {/* Jornadas section */}
      <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Jornadas / Turnos
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {JORNADA_PRESETS.map((p) => (
              <button
                key={p.tipo}
                type="button"
                onClick={() => addJornada(p)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-70',
                  JORNADA_STYLE[p.tipo].badge,
                )}
              >
                <Plus className="h-2.5 w-2.5" />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {draft.jornadas.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center italic">
            Sin turnos — añade Matutina, Nocturna o Sacafranco con los botones de arriba.
          </p>
        ) : (
          <div className="space-y-1.5">
            {draft.jornadas.map((j) => (
              <JornadaRow
                key={j.id}
                jornada={j}
                onChange={(d) => updateJornada(j.id, d)}
                onRemove={() => removeJornada(j.id)}
              />
            ))}
          </div>
        )}

        {draft.jornadas.length > 0 && (
          <p className="text-[10px] text-gray-400 pt-1">
            Cada jornada se guarda como un registro independiente en el puesto.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function PostSiteWizard({ clients = [], mode = 'create', id }: WizardProps) {
  const navigate = useNavigate();
  const { selectedClient } = useClientSelection();
  const isEdit = mode === 'edit' && !!id;

  // ── form state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

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

  // Step 4: Estaciones + Contacto
  const [stations, setStations] = useState<StationDraft[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Auto-inject client from context
  useEffect(() => {
    if (selectedClient?.id) setClientId(String(selectedClient.id));
  }, [selectedClient]);

  // Load existing site data in edit mode
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await stationService.get(id!);
        const d = data as any;
        setServiceType(d.serviceType ?? undefined);
        setClientId(d.clientAccountId ?? d.clientId ?? '');
        setAddress(d.address ?? '');
        setAddressLine2(d.secondAddress ?? d.addressLine2 ?? '');
        setCity(d.city ?? '');
        setCountry(d.country ?? '');
        setPostalCode(d.postalCode ?? '');
        setLatitud(String(d.latitud ?? d.latitude ?? ''));
        setLongitud(String(d.longitud ?? d.longitude ?? ''));
        setDescription(d.description ?? '');
        setStatus(typeof d.active === 'boolean' ? (d.active ? 'active' : 'inactive') : (d.status ?? 'active'));
        if (d.serviceConfig && typeof d.serviceConfig === 'object') {
          const { specialEquipment, trainingRequired, ...rest } = d.serviceConfig;
          setServiceConfig(rest);
          if (Array.isArray(specialEquipment)) setEquipment(specialEquipment);
          if (Array.isArray(trainingRequired)) setTraining(trainingRequired);
        }
        if (d.address || d.city) setAddressConfirmed(true);
      } catch (e) {
        toast.error('Error al cargar el sitio');
        navigate('/post-sites');
      }
    })();
  }, [isEdit, id]);

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
      serviceType,
      serviceConfig: finalConfig,
      status,
    };
  };

  // ── submit site ──────────────────────────────────────────────────────────────
  const handleCreateSite = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await stationService.update(id!, payload as any);
        toast.success('Cambios guardados');
        setStep(6);
        return;
      }
      const data = await stationService.create(payload as any);
      const newId = data.id || (data as any).data?.id;
      setCreatedId(newId);

      // Create stations — each jornada becomes its own station record
      const toCreate = stations.filter((s) => s.name.trim());
      if (toCreate.length > 0) {
        const tenantId = localStorage.getItem('tenantId') || '';
        try {
          const records = toCreate.flatMap((s) => {
            if (s.jornadas.length === 0) {
              return [{ stationName: s.name.trim(), description: s.description || undefined, postSiteId: newId, numberOfGuardsInStation: '1' }];
            }
            return s.jornadas.map((j) => ({
              stationName: s.jornadas.length === 1 ? s.name.trim() : `${s.name.trim()} - ${j.nombre}`,
              description: [s.description, s.jornadas.length > 1 ? j.nombre : ''].filter(Boolean).join(' — ') || undefined,
              postSiteId: newId,
              numberOfGuardsInStation: j.guardsCount || '1',
              startingTimeInDay: j.startTime || undefined,
              finishTimeInDay: j.endTime || undefined,
            }));
          });
          await Promise.all(
            records.map((r) => ApiService.post(`/tenant/${tenantId}/station`, { data: r })),
          );
        } catch {
          toast.error('El sitio fue creado pero algunas estaciones fallaron');
        }
      }

      toast.success('Puesto de vigilancia creado');
      setStep(6);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al crear el sitio');
    } finally {
      setSubmitting(false);
    }
  };

  const addStationDraft = () => {
    setStations((prev) => [
      ...prev,
      { name: '', description: '', jornadas: [] },
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
    // ── Step 6: Éxito ─────────────────────────────────────────────────────────
    if (step === 6) {
      const stationCount = stations.filter((s) => s.name.trim()).length;
      const targetId = isEdit ? id! : (createdId ?? '');
      return (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isEdit ? '¡Cambios guardados!' : '¡Puesto creado!'}</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {isEdit
                ? 'El sitio fue actualizado correctamente.'
                : stationCount > 0
                  ? `${stationCount} estación${stationCount !== 1 ? 'es' : ''} configurada${stationCount !== 1 ? 's' : ''} y lista${stationCount !== 1 ? 's' : ''}.`
                  : 'El sitio fue creado. Puedes añadir estaciones desde su perfil.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/post-sites')}>
              Ver todos los sitios
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/post-sites/${targetId}/profile`)}
              className="bg-amber-600 text-white hover:bg-amber-700 gap-2"
            >
              <MapPin className="h-4 w-4" />
              Ir al perfil
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
            onChange={(v) => { setServiceType(v); setStep(2); }}
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
          <div className="rounded-xl border border-gray-200 shadow-sm bg-white">
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

          {/* Deployment checks */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <Shield className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Despliegue operativo</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-xs text-gray-500 mb-1">Mínimo de estaciones</label>
                <Input
                  type="number" min={1}
                  placeholder="Ej. 2"
                  value={cfgGet('stationsRequired')}
                  onChange={(e) => cfgSet('stationsRequired', e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEPLOY_CHECKS.map(({ key, label, defaultOn = false }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => cfgSet(key, !cfgGet(key, defaultOn))}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    cfgGet(key, defaultOn)
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  )}
                >
                  <span className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                    cfgGet(key, defaultOn) ? 'border-amber-500 bg-amber-500' : 'border-gray-300',
                  )}>
                    {cfgGet(key, defaultOn) && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  <span className="text-xs font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

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

    // ── Step 4: Estaciones + Contacto ──────────────────────────────────────────
    if (step === 4) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Estaciones de vigilancia</h2>
            <p className="text-sm text-gray-500">
              Define los puestos de guardia. Cada estación tiene su propio horario y número de guardias.
            </p>
          </div>

          {/* Station builder */}
          <div className="space-y-3">
            {stations.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
                <Shield className="mx-auto h-9 w-9 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">Sin estaciones definidas</p>
                <p className="text-xs text-gray-400 mt-1">Puedes añadirlas ahora o desde el perfil del sitio.</p>
              </div>
            ) : (
              stations.map((s, i) => (
                <StationRow
                  key={i}
                  draft={s}
                  onChange={(d) => updateStation(i, d)}
                  onRemove={() => removeStation(i)}
                />
              ))
            )}
            <button
              type="button"
              onClick={addStationDraft}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-amber-300 hover:text-amber-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir estación
            </button>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <label className="block text-xs text-gray-500 mb-2">Estado del sitio</label>
            <div className="flex gap-2 max-w-xs">
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
              <SummaryRow icon={<Shield className="h-4 w-4" />} label="Estaciones" value={stations.filter(s => s.name.trim()).length > 0 ? `${stations.filter(s => s.name.trim()).length} definida${stations.filter(s => s.name.trim()).length !== 1 ? 's' : ''}` : undefined} />
            </div>
          </div>

          {/* Equipment & training chips */}
          {(allEquip.length > 0 || allTraining.length > 0) && (            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Stations summary */}
          {stations.filter((s) => s.name.trim()).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                <Shield className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-semibold text-gray-700">
                  Estaciones ({stations.filter((s) => s.name.trim()).length})
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {stations.filter((s) => s.name.trim()).map((s, i) => (
                  <div key={i} className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-400 mb-1">{s.description}</p>}
                    {s.jornadas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {s.jornadas.map((j) => (
                          <span key={j.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${JORNADA_STYLE[j.tipo].badge}`}>
                            {j.nombre}
                            {j.startTime && j.endTime && <span className="font-mono opacity-70 ml-1">{j.startTime}–{j.endTime}</span>}
                            <span className="flex items-center gap-0.5 opacity-70 ml-1"><Users className="h-2.5 w-2.5" />{j.guardsCount||'1'}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Sin jornadas definidas</p>
                    )}
                  </div>
                ))}
              </div>
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
  const TOTAL_MAIN_STEPS = isEdit ? 4 : 5; // edit skips step 1

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar (only on main steps) */}
      {!isStationStep && (
        <div className="mb-8">
          <StepBar current={isEdit ? step - 1 : step} total={TOTAL_MAIN_STEPS} />
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
              if (step <= (isEdit ? 2 : 1)) navigate(isEdit ? `/post-sites/${id}` : '/post-sites');
              else setStep((s) => s - 1);
            }}
            className="gap-1.5 text-gray-600"
          >
            <ChevronLeft className="h-4 w-4" />
            {step <= (isEdit ? 2 : 1) ? 'Cancelar' : 'Atrás'}
          </Button>

          {isLastMainStep ? (
            <Button
              type="button"
              onClick={handleCreateSite}
              disabled={submitting || !address.trim()}
              className="bg-[#C8860A] text-white hover:bg-[#B37809] gap-2 min-w-36"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? 'Guardando…' : 'Creando…'}</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> {isEdit ? 'Guardar cambios' : 'Crear Sitio'}</>
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
