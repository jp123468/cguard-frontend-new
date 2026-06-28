import { useState } from "react";
import { X, Palette, MapPin, ShieldCheck, Save, RotateCcw } from "lucide-react";
import type { DashboardPrefs } from "../prefs";
import { DEFAULT_PREFS } from "../prefs";
import type { EntityKind, LiveStatus } from "../types";
import { MAP_ICONS, ICON_NAMES } from "../iconRegistry";

const KIND_LABEL: Record<EntityKind, string> = {
  tenant: "Sede / negocio", station: "Puesto", supervisor: "Supervisor", guard: "Vigilante", incident: "Incidente",
};
const STATUS_LABEL: Record<LiveStatus, string> = {
  online: "En línea", offline: "Fuera de línea", patrol: "En ronda",
  incident: "Incidente", delayed: "Retrasado", emergency: "Emergencia",
};

/** Slide-over settings sheet. Persists via prefs (localStorage today; documented
 *  backend gap for a per-tenant dashboard-prefs endpoint). */
export function CustomizePanel({
  open, value, onClose, onSave,
}: { open: boolean; value: DashboardPrefs; onClose: () => void; onSave: (p: DashboardPrefs) => void }) {
  const [p, setP] = useState<DashboardPrefs>(value);
  if (!open) return null;
  const set = (patch: Partial<DashboardPrefs>) => setP((s) => ({ ...s, ...patch }));

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="cc-glass relative h-full w-full max-w-md overflow-y-auto rounded-none border-l p-5 animate-in slide-in-from-right">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">Personalizar panel</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5"><X size={18} /></button>
        </div>

        <Group icon={<Palette size={15} />} title="Apariencia">
          <Row label="Color de acento">
            <ColorInput value={p.accent} onChange={(v) => set({ accent: v })} />
          </Row>
          <Row label="Tema del mapa">
            <select value={p.mapTheme} onChange={(e) => set({ mapTheme: e.target.value as any })} className={selCls}>
              <option value="dark">Oscuro</option><option value="night">Noche</option><option value="roadmap">Estándar</option>
            </select>
          </Row>
        </Group>

        <Group icon={<MapPin size={15} />} title="Pines del mapa — color e ícono">
          {(Object.keys(p.pinColors) as EntityKind[]).map((k) => {
            const Preview = MAP_ICONS[p.pinIcons[k]] || MapPin;
            return (
              <div key={k} className="rounded-lg bg-white/[0.03] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: p.pinColors[k] }}>
                      <Preview size={13} color="#0b1020" strokeWidth={2.6} />
                    </span>
                    {KIND_LABEL[k]}
                  </span>
                  <ColorInput value={p.pinColors[k]} onChange={(v) => set({ pinColors: { ...p.pinColors, [k]: v } })} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ICON_NAMES.map((name) => {
                    const Icon = MAP_ICONS[name];
                    const active = p.pinIcons[k] === name;
                    return (
                      <button key={name} type="button" title={name}
                        onClick={() => set({ pinIcons: { ...p.pinIcons, [k]: name } })}
                        className={`grid h-7 w-7 place-items-center rounded-md border transition ${active ? "" : "border-border/50 text-muted-foreground hover:text-foreground"}`}
                        style={active ? { borderColor: p.pinColors[k], color: p.pinColors[k], background: `color-mix(in oklab, ${p.pinColors[k]} 14%, transparent)` } : undefined}>
                        <Icon size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Group>

        <Group icon={<Palette size={15} />} title="Colores de estado / severidad">
          {(Object.keys(p.statusColors) as LiveStatus[]).map((k) => (
            <Row key={k} label={STATUS_LABEL[k]}>
              <ColorInput value={p.statusColors[k]} onChange={(v) => set({ statusColors: { ...p.statusColors, [k]: v } })} />
            </Row>
          ))}
        </Group>

        <Group icon={<ShieldCheck size={15} />} title="Operaciones de seguridad">
          <Toggle label="Rastreo de ubicación en vivo" checked={p.liveTracking} onChange={(v) => set({ liveTracking: v })} />
          <Row label="Intervalo de ubicación (s)">
            <NumInput value={p.locationIntervalSec} min={5} max={120} onChange={(v) => set({ locationIntervalSec: v })} />
          </Row>
          <Toggle label="Exigir foto en punto de control" checked={p.requirePhotoCheckpoint} onChange={(v) => set({ requirePhotoCheckpoint: v })} />
          <Toggle label="Exigir GPS en punto de control" checked={p.requireGpsCheckpoint} onChange={(v) => set({ requireGpsCheckpoint: v })} />
          <Toggle label="Exigir escaneo QR en ronda" checked={p.requireQrRonda} onChange={(v) => set({ requireQrRonda: v })} />
          <Row label="Radio de geocerca (m)"><NumInput value={p.geofenceRadius} min={20} max={2000} onChange={(v) => set({ geofenceRadius: v })} /></Row>
          <Row label="Umbral punto de control tardío (min)"><NumInput value={p.lateCheckpointThresholdMin} min={1} max={120} onChange={(v) => set({ lateCheckpointThresholdMin: v })} /></Row>
          <Row label="Aviso dispositivo offline (min)"><NumInput value={p.offlineDeviceWarningMin} min={1} max={120} onChange={(v) => set({ offlineDeviceWarningMin: v })} /></Row>
          <Row label="Niveles de escalación de alerta"><NumInput value={p.alertEscalationLevels} min={1} max={5} onChange={(v) => set({ alertEscalationLevels: v })} /></Row>
          <Toggle label="Notificación automática de emergencia" checked={p.emergencyAutoNotify} onChange={(v) => set({ emergencyAutoNotify: v })} />
        </Group>

        <p className="mb-4 text-[11px] text-amber-400/70">
          Nota: estas preferencias se guardan localmente. Falta un endpoint de preferencias del panel por inquilino para persistir en el servidor.
        </p>

        <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-border/60 bg-background/80 px-5 py-3 backdrop-blur">
          <button onClick={() => setP({ ...DEFAULT_PREFS })}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            <RotateCcw size={14} /> Restablecer
          </button>
          <button onClick={() => onSave(p)}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-black"
            style={{ background: "var(--cc-accent)" }}>
            <Save size={15} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const selCls = "rounded-md border border-border/60 bg-white/[0.03] px-2 py-1 text-sm text-foreground";
function Group({ icon, title, children }: any) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="cc-accent-text">{icon}</span>{title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ label, children }: any) {
  return <div className="flex items-center justify-between gap-3 py-1"><span className="text-sm text-foreground">{label}</span>{children}</div>;
}
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-border/60 bg-transparent" />
      <span className="font-mono text-xs text-muted-foreground">{value}</span>
    </span>
  );
}
function NumInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return <input type="number" value={value} min={min} max={max}
    onChange={(e) => onChange(Number(e.target.value))} className={`w-20 ${selCls}`} />;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1">
      <span className="text-sm text-foreground">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "" : "bg-white/10"}`}
        style={checked ? { background: "var(--cc-accent)" } : undefined}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
