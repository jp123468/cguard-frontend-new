import * as React from "react";
import { Info, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { notificationSettingsService } from "@/lib/api/notificationSettingsService";
import { Section } from "@/components/kit";

type ChannelKey = "dashboard" | "email" | "sms";

type NotificationItem = {
  id: string;
  label: string;
  hint?: string;
  default?: Partial<Record<ChannelKey, boolean>>;
};

type MatrixState = Record<
  string,
  {
    dashboard: boolean;
    email: boolean;
    sms: boolean;
  }
>;

// ================== Datos (puedes moverlos a un JSON externo) ==================
const NOTIFICATIONS: NotificationItem[] = [
  { id: "check-in-out", label: "Vigilante registrado/salida", hint: "Check-in/out del vigilante", default: { dashboard: true, email: true } },
  { id: "report-sent", label: "Informe enviado", default: { dashboard: true } },
  { id: "task-completed", label: "Tarea completada", default: { dashboard: true } },
  { id: "task-missed", label: "Tarea perdida o retrasada", default: { dashboard: true } },
  { id: "post-orders-ack", label: "Órdenes de publicación reconocidas", default: { dashboard: true } },
  { id: "policy-ack", label: "Política de la empresa reconocida", default: { dashboard: true } },
  { id: "site-tour-complete", label: "Recorrido del sitio completado", default: { dashboard: true } },
  { id: "site-tour-missed", label: "Recorrido del sitio perdido o retrasado", default: { dashboard: true } },
  { id: "dispatch-updates", label: "Actualizaciones de tickets de Incidente", default: { dashboard: true } },
  { id: "shift-status", label: "Actualizaciones del estado del turno", default: { dashboard: true } },
  { id: "late-on-shift", label: "Retraso en el turno", default: { dashboard: true } },
  { id: "vigilance-mode", label: "Entrada de modo vigilancia enviada", default: { dashboard: true } },
  { id: "checklist-complete", label: "Lista de verificación completada", default: { dashboard: true } },
  { id: "inactive-guard-alert", label: "Alerta de inactividad para vigilantes inactivos", default: { dashboard: true } },
  { id: "geofence-alert", label: "Alertas de geovalla al entrar/salir", default: { dashboard: true } },
  { id: "pto-request", label: "Solicitud de tiempo libre", default: { dashboard: true } },
  { id: "panic-button", label: "Informe del botón de pánico", default: { dashboard: true } },
  { id: "guard-late", label: "Vigilante tardío", default: { dashboard: true } },
  { id: "no-show", label: "Vigilante sin asistencia", default: { dashboard: true } },
  { id: "patrol-route", label: "Inicio y fin de ruta de patrulla vehicular", default: { dashboard: true } },
  { id: "comment-mention", label: "Mención en un comentario", default: { dashboard: true } },
  { id: "parking-admin", label: "Administrador de estacionamiento", default: { dashboard: true } },
  { id: "license-expiry", label: "Expiración de Licencia" },
  { id: "fall-detection", label: "Caída del Vigilante/Dispositivo" },
];

const columns: { key: ChannelKey; label: string }[] = [
  { key: "dashboard", label: "Panel de control" },
  { key: "email", label: "Correo electrónico" },
  { key: "sms", label: "SMS" },
];

// =============================================================================

export default function NotificationMatrix() {
  const buildDefaults = (): MatrixState => {
    const initial: MatrixState = {};
    NOTIFICATIONS.forEach((n) => {
      initial[n.id] = {
        dashboard: !!n.default?.dashboard,
        email: !!n.default?.email,
        sms: !!n.default?.sms,
      };
    });
    return initial;
  };

  const [state, setState] = React.useState<MatrixState>(buildDefaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    notificationSettingsService
      .get()
      .then((res) => {
        if (!mounted) return;
        const saved = res?.preferences || {};
        setState((prev) => {
          const merged: MatrixState = { ...prev };
          NOTIFICATIONS.forEach((n) => {
            const s = saved[n.id];
            if (s) {
              merged[n.id] = {
                dashboard: !!s.dashboard,
                email: !!s.email,
                sms: !!s.sms,
              };
            }
          });
          return merged;
        });
      })
      .catch(() => {
        /* keep defaults if load fails */
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allCheckedByColumn = (col: ChannelKey) =>
    NOTIFICATIONS.every((n) => state[n.id]?.[col]);

  const someCheckedByColumn = (col: ChannelKey) =>
    NOTIFICATIONS.some((n) => state[n.id]?.[col]);

  const toggleColumn = (col: ChannelKey, value: boolean) => {
    setState((prev) => {
      const copy: MatrixState = { ...prev };
      NOTIFICATIONS.forEach((n) => {
        copy[n.id] = { ...copy[n.id], [col]: value };
      });
      return copy;
    });
  };

  const toggleCell = (id: string, col: ChannelKey, value: boolean) => {
    setState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [col]: value },
    }));
  };

  const toggleRow = (id: string, value: boolean) => {
    setState((prev) => ({
      ...prev,
      [id]: { dashboard: value, email: value, sms: value },
    }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const preferences: MatrixState = {};
      NOTIFICATIONS.forEach((n) => {
        preferences[n.id] = state[n.id];
      });
      await notificationSettingsService.update(preferences);
      toast.success("Preferencias de notificación guardadas");
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron guardar las preferencias");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Preferencias de notificación" icon={<Bell />} contentClassName="space-y-4">

      <div className="rounded-2xl border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(3,160px)] items-center gap-2 px-4 py-3 bg-muted/30">
          <div className="text-[13px] font-medium text-muted-foreground">Tipo de Notificación</div>
          {columns.map((c) => {
            const all = allCheckedByColumn(c.key);
            const some = someCheckedByColumn(c.key);
            return (
              <div key={c.key} className="flex items-center justify-center gap-2">
                <Checkbox
                  checked={all}
                  onCheckedChange={(v) => toggleColumn(c.key, Boolean(v))}
                  aria-label={`Seleccionar todo ${c.label}`}
                  className={cn(some && !all && "data-[state=indeterminate]:opacity-100")}
                />
                <span className="text-[13px] font-medium">{c.label}</span>
              </div>
            );
          })}
        </div>
        <Separator />

        {/* Body */}
        <ScrollArea className="max-h-[68vh]">
          <div className="divide-y">
            {NOTIFICATIONS.map((n) => {
              const row = state[n.id];
              const allRow = row.dashboard && row.email && row.sms;
              const someRow = [row.dashboard, row.email, row.sms].some(Boolean) && !allRow;

              return (
                <div
                  key={n.id}
                  className="grid grid-cols-[1fr_repeat(3,160px)] items-center gap-2 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allRow}
                      onCheckedChange={(v) => toggleRow(n.id, Boolean(v))}
                      className={cn(someRow && "data-[state=indeterminate]:opacity-100")}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{n.label}</span>
                      {n.hint && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">{n.hint}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {columns.map((c) => (
                    <div key={c.key} className="flex justify-center">
                      <Checkbox
                        checked={row[c.key]}
                        onCheckedChange={(v) => toggleCell(n.id, c.key, Boolean(v))}
                        aria-label={`${n.label} - ${c.label}`}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex py-3 px-3 justify-end border-t bg-muted/20">
          <Button
              variant="brand"
              onClick={onSave}
              disabled={saving || loading}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
        </div>
      </div>
    </Section>
  );
}
