/**
 * ServiceTypeConfigFields
 * Renders a contextual set of operational fields based on the selected
 * service type. All fields are optional and stored as a JSON blob in
 * `serviceConfig` on the businessInfo record.
 *
 * Per-type field catalogue follows enterprise security industry standards:
 *   manned   → guard deployment parameters
 *   alarm    → monitoring account & SLA setup
 *   cctv     → camera system specification
 *   patrol   → mobile patrol scheduling
 *   custody  → escort / asset-protection details
 */
import React from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, BellElectric, Camera, Car, Lock,
  Users, Clock, AlertTriangle, Radio, Eye,
  MapPin, Truck, Star, Zap,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
      {icon}
    </span>
    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">{title}</h3>
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {children}
    {hint && <span className="ml-1 text-xs text-gray-400 font-normal">({hint})</span>}
  </label>
);

interface CheckboxGroupProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() =>
            onChange(checked ? value.filter((v) => v !== opt.value) : [...value, opt.value])
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            checked
              ? 'border-amber-400 bg-amber-100 text-amber-800'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
          )}
        >
          {checked && <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />}
          {opt.label}
        </button>
      );
    })}
  </div>
);

interface SelectFieldProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({ value, onChange, options, placeholder }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      'flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
      checked ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300',
    )}
  >
    <span className={cn(
      'mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors relative',
      checked ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-gray-100',
    )}>
      <span className={cn(
        'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-[14px]' : 'translate-x-0.5',
      )} />
    </span>
    <span>
      <span className="block text-sm font-medium text-gray-800">{label}</span>
      {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
    </span>
  </button>
);

// ─── per-type config helpers ───────────────────────────────────────────────────

function useConfig(form: UseFormReturn<any>) {
  const cfg: Record<string, any> = useWatch({ control: form.control, name: 'serviceConfig' }) ?? {};
  const set = (key: string, val: any) =>
    form.setValue('serviceConfig', { ...cfg, [key]: val }, { shouldDirty: true });
  const get = (key: string, fallback: any = '') => cfg[key] ?? fallback;
  return { cfg, set, get };
}

// ─── Manned Guarding ──────────────────────────────────────────────────────────

function MannedFields({ form }: { form: UseFormReturn<any> }) {
  const { set, get } = useConfig(form);

  const trainingOptions = [
    { value: 'firstAid', label: 'Primeros auxilios' },
    { value: 'crowdControl', label: 'Control de multitudes' },
    { value: 'firearms', label: 'Manejo de armas' },
    { value: 'evacuation', label: 'Evacuación' },
    { value: 'accessControl', label: 'Control de acceso' },
    { value: 'cctv', label: 'Circuito cerrado (CCTV)' },
    { value: 'customerService', label: 'Servicio al cliente' },
  ];

  const equipmentOptions = [
    { value: 'radio', label: 'Radio comunicador' },
    { value: 'metalDetector', label: 'Detector de metales' },
    { value: 'flashlight', label: 'Linterna táctica' },
    { value: 'vehicle', label: 'Vehículo asignado' },
    { value: 'bodycam', label: 'Bodycam' },
    { value: 'baton', label: 'Bastón' },
    { value: 'handcuffs', label: 'Esposas' },
  ];

  return (
    <div className="space-y-6">
      {/* Deployment */}
      <div>
        <SectionTitle icon={<Users className="h-4 w-4" />} title="Despliegue de guardias" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="obligatorio">Estaciones requeridas</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 2"
              value={get('stationsRequired')}
              onChange={(e) => set('stationsRequired', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Tipo de puesto</FieldLabel>
            <SelectField
              value={get('postType')}
              onChange={(v) => set('postType', v)}
              placeholder="Seleccionar..."
              options={[
                { value: 'fixed', label: 'Fijo' },
                { value: 'mobile', label: 'Móvil' },
                { value: 'mixed', label: 'Mixto (fijo + rondas)' },
              ]}
            />
          </div>
          <div>
            <FieldLabel>Nivel de riesgo</FieldLabel>
            <SelectField
              value={get('riskLevel')}
              onChange={(v) => set('riskLevel', v)}
              placeholder="Seleccionar..."
              options={[
                { value: 'low', label: 'Bajo' },
                { value: 'medium', label: 'Medio' },
                { value: 'high', label: 'Alto' },
                { value: 'critical', label: 'Crítico' },
              ]}
            />
          </div>
          <div>
            <FieldLabel hint="años mínimos">Experiencia requerida</FieldLabel>
            <SelectField
              value={get('minExperienceYears')}
              onChange={(v) => set('minExperienceYears', v)}
              placeholder="Sin requisito"
              options={[
                { value: '0', label: 'Sin requisito' },
                { value: '1', label: '1 año' },
                { value: '2', label: '2 años' },
                { value: '3', label: '3 años' },
                { value: '5', label: '5 años o más' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Service options */}
      <div>
        <SectionTitle icon={<Shield className="h-4 w-4" />} title="Opciones del servicio" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle
            checked={!!get('armedService', false)}
            onChange={(v) => set('armedService', v)}
            label="Servicio armado"
            description="El guardia porta arma de fuego autorizada"
          />
          <Toggle
            checked={!!get('uniformRequired', true)}
            onChange={(v) => set('uniformRequired', v)}
            label="Uniforme requerido"
            description="Se exige uniforme oficial de la empresa"
          />
          <Toggle
            checked={!!get('supervisorRequired', false)}
            onChange={(v) => set('supervisorRequired', v)}
            label="Supervisor asignado"
            description="Se asigna un supervisor al puesto"
          />
          <Toggle
            checked={!!get('keyAccessRequired', false)}
            onChange={(v) => set('keyAccessRequired', v)}
            label="Acceso con llaves / tarjeta"
            description="El guardia necesita acceso físico al inmueble"
          />
        </div>
      </div>

      {/* Training */}
      <div>
        <SectionTitle icon={<Star className="h-4 w-4" />} title="Capacitación requerida" />
        <CheckboxGroup
          options={trainingOptions}
          value={get('trainingRequired', [])}
          onChange={(v) => set('trainingRequired', v)}
        />
      </div>

      {/* Equipment */}
      <div>
        <SectionTitle icon={<Zap className="h-4 w-4" />} title="Equipamiento especial" />
        <CheckboxGroup
          options={equipmentOptions}
          value={get('specialEquipment', [])}
          onChange={(v) => set('specialEquipment', v)}
        />
      </div>

      {/* SOP */}
      <div>
        <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="Instrucciones del puesto (SOP)" />
        <Textarea
          placeholder="Describa los procedimientos operativos estándar: protocolo de acceso, manejo de visitantes, emergencias, comunicación con supervisores..."
          rows={4}
          value={get('postInstructions')}
          onChange={(e) => set('postInstructions', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Alarm Response ───────────────────────────────────────────────────────────

function AlarmFields({ form }: { form: UseFormReturn<any> }) {
  const { set, get } = useConfig(form);
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={<BellElectric className="h-4 w-4" />} title="Central de monitoreo" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Marca del sistema de alarma</FieldLabel>
            <Input
              placeholder="Ej. Honeywell, Paradox, DSC..."
              value={get('alarmSystemBrand')}
              onChange={(e) => set('alarmSystemBrand', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>N° de cuenta / contrato</FieldLabel>
            <Input
              placeholder="Número de cuenta en central"
              value={get('monitoringAccountNumber')}
              onChange={(e) => set('monitoringAccountNumber', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Teléfono de la central</FieldLabel>
            <Input
              placeholder="+1 555 000 0000"
              value={get('monitoringCenterPhone')}
              onChange={(e) => set('monitoringCenterPhone', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel hint="minutos">Tiempo de respuesta SLA</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 10"
              value={get('responseTimeSLAMinutes')}
              onChange={(e) => set('responseTimeSLAMinutes', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Zonas / circuitos de alarma</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 4"
              value={get('alarmZones')}
              onChange={(e) => set('alarmZones', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
        </div>
      </div>
      <div>
        <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="Protocolos" />
        <div className="space-y-4">
          <div>
            <FieldLabel>Lista de contactos de emergencia</FieldLabel>
            <Textarea
              placeholder="Nombre, cargo, teléfono — uno por línea"
              rows={3}
              value={get('emergencyContactList')}
              onChange={(e) => set('emergencyContactList', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Protocolo de alarma falsa</FieldLabel>
            <Textarea
              placeholder="Procedimiento a seguir cuando se activa una alarma falsa..."
              rows={3}
              value={get('falseAlarmProtocol')}
              onChange={(e) => set('falseAlarmProtocol', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CCTV ─────────────────────────────────────────────────────────────────────

function CctvFields({ form }: { form: UseFormReturn<any> }) {
  const { set, get } = useConfig(form);

  const cameraTypeOptions = [
    { value: 'dome', label: 'Domo' },
    { value: 'bullet', label: 'Bullet' },
    { value: 'ptz', label: 'PTZ' },
    { value: 'fisheye', label: 'Ojo de pez' },
    { value: 'thermal', label: 'Térmica' },
    { value: 'lpr', label: 'LPR (matrículas)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={<Camera className="h-4 w-4" />} title="Sistema de videovigilancia" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Cantidad de cámaras</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 8"
              value={get('cameraCount')}
              onChange={(e) => set('cameraCount', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>DVR / NVR (marca y modelo)</FieldLabel>
            <Input
              placeholder="Ej. Hikvision DS-7616NI-K2"
              value={get('dvrNvrBrand')}
              onChange={(e) => set('dvrNvrBrand', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Resolución mínima</FieldLabel>
            <SelectField
              value={get('resolution')}
              onChange={(v) => set('resolution', v)}
              placeholder="Seleccionar..."
              options={[
                { value: '720p', label: '720p HD' },
                { value: '1080p', label: '1080p Full HD' },
                { value: '4k', label: '4K Ultra HD' },
              ]}
            />
          </div>
          <div>
            <FieldLabel hint="días">Retención de grabaciones</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 30"
              value={get('storageRetentionDays')}
              onChange={(e) => set('storageRetentionDays', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Monitoreo activo</FieldLabel>
            <SelectField
              value={get('monitoringSchedule')}
              onChange={(v) => set('monitoringSchedule', v)}
              placeholder="Seleccionar..."
              options={[
                { value: '24_7', label: '24/7 continuo' },
                { value: 'business_hours', label: 'Horario de oficina' },
                { value: 'night_only', label: 'Solo nocturno' },
                { value: 'event_triggered', label: 'Solo por evento' },
              ]}
            />
          </div>
        </div>
      </div>
      <div>
        <SectionTitle icon={<Eye className="h-4 w-4" />} title="Capacidades técnicas" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle
            checked={!!get('nightVisionEnabled', false)}
            onChange={(v) => set('nightVisionEnabled', v)}
            label="Visión nocturna"
            description="Las cámaras tienen capacidad infrarroja o térmica"
          />
          <Toggle
            checked={!!get('remoteAccessEnabled', false)}
            onChange={(v) => set('remoteAccessEnabled', v)}
            label="Acceso remoto habilitado"
            description="Las grabaciones son accesibles desde fuera del sitio"
          />
          <Toggle
            checked={!!get('analyticsEnabled', false)}
            onChange={(v) => set('analyticsEnabled', v)}
            label="Video analítica (IA)"
            description="Detección de intrusos, reconocimiento facial, etc."
          />
          <Toggle
            checked={!!get('audioEnabled', false)}
            onChange={(v) => set('audioEnabled', v)}
            label="Audio bidireccional"
            description="Altavoces integrados o micrófonos en cámaras"
          />
        </div>
      </div>
      <div>
        <SectionTitle icon={<Camera className="h-4 w-4" />} title="Tipos de cámara" />
        <CheckboxGroup
          options={cameraTypeOptions}
          value={get('cameraTypes', [])}
          onChange={(v) => set('cameraTypes', v)}
        />
      </div>
    </div>
  );
}

// ─── Mobile Patrol ────────────────────────────────────────────────────────────

function PatrolFields({ form }: { form: UseFormReturn<any> }) {
  const { set, get } = useConfig(form);

  const vehicleOptions = [
    { value: 'car', label: 'Automóvil' },
    { value: 'suv', label: 'SUV / Camioneta' },
    { value: 'motorcycle', label: 'Motocicleta' },
    { value: 'bicycle', label: 'Bicicleta' },
    { value: 'foot', label: 'A pie' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={<Car className="h-4 w-4" />} title="Configuración de ronda" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Rondas por día</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 4"
              value={get('patrolFrequencyPerDay')}
              onChange={(e) => set('patrolFrequencyPerDay', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Oficiales de patrulla</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 2"
              value={get('patrolOfficers')}
              onChange={(e) => set('patrolOfficers', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Puntos de control (checkpoints)</FieldLabel>
            <Input
              type="number"
              min={0}
              placeholder="Ej. 5"
              value={get('checkpointCount')}
              onChange={(e) => set('checkpointCount', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Frecuencia de informes</FieldLabel>
            <SelectField
              value={get('reportFrequency')}
              onChange={(v) => set('reportFrequency', v)}
              placeholder="Seleccionar..."
              options={[
                { value: 'each_patrol', label: 'Por cada ronda' },
                { value: 'daily', label: 'Diario' },
                { value: 'weekly', label: 'Semanal' },
              ]}
            />
          </div>
        </div>
      </div>

      <div>
        <SectionTitle icon={<Radio className="h-4 w-4" />} title="Opciones de seguimiento" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle
            checked={!!get('gpsTrackingEnabled', false)}
            onChange={(v) => set('gpsTrackingEnabled', v)}
            label="Rastreo GPS activo"
            description="Todas las unidades son monitoreadas en tiempo real"
          />
          <Toggle
            checked={!!get('incidentReportRequired', false)}
            onChange={(v) => set('incidentReportRequired', v)}
            label="Reporte de incidentes"
            description="La app móvil registra novedades en cada ronda"
          />
        </div>
      </div>

      <div>
        <SectionTitle icon={<Car className="h-4 w-4" />} title="Tipo de vehículo" />
        <CheckboxGroup
          options={vehicleOptions}
          value={get('vehicleTypes', [])}
          onChange={(v) => set('vehicleTypes', v)}
        />
      </div>

      <div>
        <FieldLabel>Descripción de la ruta / instrucciones de patrulla</FieldLabel>
        <Textarea
          placeholder="Describa el recorrido, puntos críticos, frecuencia por zona, instrucciones especiales..."
          rows={4}
          value={get('patrolRouteDescription')}
          onChange={(e) => set('patrolRouteDescription', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Custody & Escort ─────────────────────────────────────────────────────────

function CustodyFields({ form }: { form: UseFormReturn<any> }) {
  const { set, get } = useConfig(form);
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={<Lock className="h-4 w-4" />} title="Principal / Activo a proteger" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldLabel>Nombre del principal o descripción del activo</FieldLabel>
            <Input
              placeholder="Ej. Sr. José Pérez — CEO / Transporte de efectivo"
              value={get('principalName')}
              onChange={(e) => set('principalName', e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Nivel de riesgo</FieldLabel>
            <SelectField
              value={get('riskLevel')}
              onChange={(v) => set('riskLevel', v)}
              placeholder="Seleccionar..."
              options={[
                { value: 'low', label: 'Bajo' },
                { value: 'medium', label: 'Medio' },
                { value: 'high', label: 'Alto' },
                { value: 'critical', label: 'Crítico' },
              ]}
            />
          </div>
          <div>
            <FieldLabel>Número de escoltas</FieldLabel>
            <Input
              type="number"
              min={1}
              placeholder="Ej. 2"
              value={get('numberOfEscorts')}
              onChange={(e) => set('numberOfEscorts', e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <FieldLabel>Vehículo de escolta</FieldLabel>
            <SelectField
              value={get('escortVehicleType')}
              onChange={(v) => set('escortVehicleType', v)}
              placeholder="Seleccionar..."
              options={[
                { value: 'armored', label: 'Blindado' },
                { value: 'standard', label: 'Estándar' },
                { value: 'suv', label: 'SUV / Camioneta' },
                { value: 'motorcycle', label: 'Motocicleta' },
                { value: 'none', label: 'Sin vehículo' },
              ]}
            />
          </div>
          <div>
            <FieldLabel hint="aprox.">Duración del servicio</FieldLabel>
            <Input
              placeholder="Ej. 8 horas / lunes a viernes"
              value={get('estimatedDuration')}
              onChange={(e) => set('estimatedDuration', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <SectionTitle icon={<Truck className="h-4 w-4" />} title="Opciones de escolta" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle
            checked={!!get('armedEscortRequired', false)}
            onChange={(v) => set('armedEscortRequired', v)}
            label="Escolta armada"
            description="Los escoltas portan armamento autorizado"
          />
          <Toggle
            checked={!!get('advanceTeamRequired', false)}
            onChange={(v) => set('advanceTeamRequired', v)}
            label="Equipo de avanzada"
            description="Reconocimiento de ruta previo al desplazamiento"
          />
          <Toggle
            checked={!!get('vehicleTracking', false)}
            onChange={(v) => set('vehicleTracking', v)}
            label="Rastreo GPS del convoy"
            description="Monitoreo en tiempo real por la central"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Descripción de ruta / instrucciones de escolta</FieldLabel>
        <Textarea
          placeholder="Puntos de origen y destino, rutas alternativas, zonas de riesgo, procedimientos de emergencia..."
          rows={4}
          value={get('routeDescription')}
          onChange={(e) => set('routeDescription', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  serviceType: string | null | undefined;
  form: UseFormReturn<any>;
}

const CONFIG_META: Record<string, { label: string; icon: React.ReactNode }> = {
  manned:  { label: 'Configuración — Vigilancia con Guardias', icon: <Shield className="h-4 w-4" /> },
  alarm:   { label: 'Configuración — Alarma y Respuesta',      icon: <BellElectric className="h-4 w-4" /> },
  cctv:    { label: 'Configuración — Videovigilancia',          icon: <Camera className="h-4 w-4" /> },
  patrol:  { label: 'Configuración — Patrulla Móvil',           icon: <Car className="h-4 w-4" /> },
  custody: { label: 'Configuración — Custodia y Escolta',       icon: <Lock className="h-4 w-4" /> },
};

export default function ServiceTypeConfigFields({ serviceType, form }: Props) {
  if (!serviceType) return null;

  const meta = CONFIG_META[serviceType];

  const inner = (() => {
    switch (serviceType) {
      case 'manned':  return <MannedFields form={form} />;
      case 'alarm':   return <AlarmFields form={form} />;
      case 'cctv':    return <CctvFields form={form} />;
      case 'patrol':  return <PatrolFields form={form} />;
      case 'custody': return <CustodyFields form={form} />;
      default:        return null;
    }
  })();

  if (!inner) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-1">
      <div className="flex items-center gap-2 mb-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-200 text-amber-800">
          {meta.icon}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
          {meta.label}
        </h2>
      </div>
      {inner}
    </section>
  );
}
