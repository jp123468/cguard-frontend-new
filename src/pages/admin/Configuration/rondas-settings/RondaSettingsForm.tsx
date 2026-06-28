import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Clock, ShieldCheck, Bell } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { rondaSettingsService, RondaSettings } from "@/lib/api/rondaSettingsService";

const DEFAULTS: RondaSettings = {
  frequencyMinutes: 60,
  roundsPerShift: null,
  graceMinutes: 10,
  maxDurationMinutes: 60,
  requirePhoto: true,
  requireGeofence: true,
  geofenceRadius: 50,
  requireNote: false,
  notifyTenantOnStart: true,
  notifyTenantOnComplete: true,
  notifyTenantOnMissed: true,
  notifyClient: false,
  emailOnComplete: false,
  active: true,
};

function NumberRow({ label, hint, value, onChange, min = 0, suffix }: {
  label: string; hint?: string; value: number | null;
  onChange: (n: number | null) => void; min?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" min={min} value={value ?? ""} className="w-24 text-right"
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
        {suffix && <span className="w-10 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onCheckedChange }: {
  label: string; hint?: string; checked: boolean; onCheckedChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/**
 * Reusable patrol-settings form. With no `postSiteId` it edits the tenant default;
 * with a `postSiteId` it edits that post site's override (falling back to the default).
 */
export default function RondaSettingsForm({
  postSiteId,
  onSaved,
}: {
  postSiteId?: string;
  onSaved?: () => void;
}) {
  const [s, setS] = useState<RondaSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inherited, setInherited] = useState(false);
  const set = <K extends keyof RondaSettings>(k: K, v: RondaSettings[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    setLoading(true);
    rondaSettingsService
      .get(postSiteId)
      .then((res) => {
        setS({ ...DEFAULTS, ...res });
        // If we asked for a post-site but got the tenant default, it's inherited.
        setInherited(Boolean(postSiteId) && (res.isDefault === true || !res.postSiteId));
      })
      .catch(() => toast.error("No se pudieron cargar las configuraciones"))
      .finally(() => setLoading(false));
  }, [postSiteId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await rondaSettingsService.update({ ...s, postSiteId: postSiteId ?? null });
      setS({ ...DEFAULTS, ...res });
      setInherited(false);
      toast.success("Configuraciones de rondas guardadas");
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {postSiteId && inherited && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Este sitio usa la configuración predeterminada del inquilino. Al guardar, creará una configuración específica para este sitio.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock size={18} className="text-primary" /> Cadencia de la ronda
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <NumberRow label="Frecuencia" hint="Cada cuánto debe realizarse una ronda" value={s.frequencyMinutes} onChange={(v) => set("frequencyMinutes", (v ?? 0) as number)} min={1} suffix="min" />
          <NumberRow label="Rondas por turno" hint="Número esperado de rondas por turno (opcional)" value={s.roundsPerShift} onChange={(v) => set("roundsPerShift", v)} min={1} suffix="rondas" />
          <NumberRow label="Tolerancia (gracia)" hint="Minutos de tolerancia antes de marcar una ronda como tarde" value={s.graceMinutes} onChange={(v) => set("graceMinutes", (v ?? 0) as number)} suffix="min" />
          <NumberRow label="Duración máxima" hint="Tiempo máximo para completar una ronda" value={s.maxDurationMinutes} onChange={(v) => set("maxDurationMinutes", (v ?? 0) as number)} min={1} suffix="min" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={18} className="text-primary" /> Validación de puntos
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleRow label="Requerir foto" hint="El vigilante debe tomar una foto con marca de tiempo en cada punto" checked={s.requirePhoto} onCheckedChange={(b) => set("requirePhoto", b)} />
          <ToggleRow label="Requerir geolocalización" hint="Validar la ubicación del vigilante en cada punto" checked={s.requireGeofence} onCheckedChange={(b) => set("requireGeofence", b)} />
          <NumberRow label="Radio de geocerca" hint="Distancia permitida desde el punto" value={s.geofenceRadius} onChange={(v) => set("geofenceRadius", (v ?? 0) as number)} suffix="m" />
          <ToggleRow label="Requerir nota" hint="El vigilante debe dejar una observación en cada punto" checked={s.requireNote} onCheckedChange={(b) => set("requireNote", b)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell size={18} className="text-primary" /> Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleRow label="Notificar al iniciar" hint="Avisar cuando un vigilante inicia una ronda" checked={s.notifyTenantOnStart} onCheckedChange={(b) => set("notifyTenantOnStart", b)} />
          <ToggleRow label="Notificar al completar" hint="Avisar cuando una ronda se completa" checked={s.notifyTenantOnComplete} onCheckedChange={(b) => set("notifyTenantOnComplete", b)} />
          <ToggleRow label="Enviar correo al completar" hint="Enviar un correo a los administradores/supervisores cuando una ronda se completa (requiere correo configurado)" checked={s.emailOnComplete} onCheckedChange={(b) => set("emailOnComplete", b)} />
          <ToggleRow label="Notificar rondas perdidas/tarde" checked={s.notifyTenantOnMissed} onCheckedChange={(b) => set("notifyTenantOnMissed", b)} />
          <ToggleRow label="Notificar al cliente" hint="Enviar notificaciones de ronda también al cliente del sitio" checked={s.notifyClient} onCheckedChange={(b) => set("notifyClient", b)} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-primary text-white hover:bg-primary/90">
          {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
