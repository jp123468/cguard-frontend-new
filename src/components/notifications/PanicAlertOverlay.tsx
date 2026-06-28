import { useEffect, useState, type ReactNode } from "react";
import { Siren, Phone, MapPin, User, Building2, Clock } from "lucide-react";
import { startPanicAlarm, stopPanicAlarm } from "@/lib/notificationSound";
import GoogleMapEmbed from "@/components/GoogleMap/GoogleMapEmbed";
import type { PlatformNotification } from "@/hooks/useNotificationStream";

/**
 * Centered, backdropped, IMPOSSIBLE-TO-MISS modal shown when an SOS / panic fires
 * (eventType `panic.alert`). It wails a siren and CANNOT be dismissed by clicking
 * away or a toast — the ONLY way to silence it is to RECORD the action taken, which
 * acknowledges the alarm case in the backend (logged to history). The location is
 * rendered INLINE on a live map (never a new tab). Multiple panics stack.
 */

const QUICK_ACTIONS = [
  "Contacté al vigilante en sitio",
  "Despaché supervisor / móvil",
  "Llamé a la policía (911)",
  "Contacté al cliente",
  "Falsa alarma / prueba",
];

export function PanicAlertOverlay({
  alerts,
  onAcknowledge,
}: {
  alerts: PlatformNotification[];
  /** Records the action + acknowledges the alarm case, then removes the alert. */
  onAcknowledge: (alert: PlatformNotification, action: string) => Promise<void> | void;
}) {
  const active = alerts.length > 0;
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = alerts[0];

  // Siren wails while any panic is on screen; stops when the last is acknowledged.
  useEffect(() => {
    if (!active) return;
    const stop = startPanicAlarm();
    return () => {
      stop();
      stopPanicAlarm();
    };
  }, [active]);

  // Reset the action field whenever the visible alert changes.
  useEffect(() => {
    setAction("");
  }, [latest?.id]);

  if (!active) return null;

  const p: any = latest.payload || {};
  const isClient = p.source === "client";
  const lat = Number(p.latitude);
  const lng = Number(p.longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
  const when = (() => {
    try {
      return new Date(p.at || latest.createdAt).toLocaleString("es", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "";
    }
  })();

  const phoneTel = p.phone ? String(p.phone).replace(/[^+\d]/g, "") : null;

  const handleAck = async () => {
    if (!action.trim() || saving) return;
    setSaving(true);
    try {
      await onAcknowledge(latest, action.trim());
    } finally {
      setSaving(false);
      setAction("");
    }
  };

  const Row = ({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) =>
    value ? (
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-red-500 shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-sm font-semibold text-foreground break-words">{value}</div>
        </div>
      </div>
    ) : null;

  return (
    // Dimmed backdrop — the SOS modal sits centered on top of the whole CRM. No
    // click-away dismissal: the backdrop swallows clicks (no onClick handler).
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="pointer-events-none absolute inset-0 ring-[5px] ring-inset ring-red-600 animate-pulse" />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-red-500 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 bg-red-600 px-6 py-4 text-white">
          <Siren size={36} className="shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="text-xl font-black leading-none tracking-tight">
              {isClient ? "ALERTA SOS — CLIENTE" : "ALERTA DE PÁNICO"}
            </div>
            <div className="mt-1 text-sm text-red-100">
              {isClient ? "Un cliente activó el botón de SOS" : "Un vigilante activó el botón de emergencia"}
            </div>
          </div>
          {alerts.length > 1 && (
            <span className="ml-auto shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-red-700">
              +{alerts.length - 1}
            </span>
          )}
        </div>

        {/* Body (scrollable) */}
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Row icon={<Building2 size={18} />} label="Puesto" value={p.stationName || p.siteName} />
              <Row icon={<MapPin size={18} />} label="Ubicación" value={p.address || p.location} />
              <Row icon={<User size={18} />} label={isClient ? "Cliente" : "Vigilante"} value={isClient ? (p.clientName || p.guardName) : p.guardName} />
              <Row icon={<Phone size={18} />} label="Teléfono del sitio" value={p.phone} />
              <Row icon={<Clock size={18} />} label="Hora" value={when} />
              <div className="flex flex-wrap gap-2 pt-1">
                <a href="tel:911" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                  <Phone size={16} /> Llamar 911
                </a>
                {phoneTel && (
                  <a href={`tel:${phoneTel}`} className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Phone size={16} /> Llamar al sitio
                  </a>
                )}
              </div>
            </div>

            {/* Inline live map — rendered HERE, never a new tab. */}
            <div className="h-56 overflow-hidden rounded-xl border sm:h-auto sm:min-h-[220px]">
              {hasCoords ? (
                <GoogleMapEmbed lat={lat} lng={lng} zoom={16} className="h-full w-full" height="100%" />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center bg-muted text-sm text-muted-foreground">
                  Sin coordenadas
                </div>
              )}
            </div>
          </div>

          {/* Action — REQUIRED to silence. Logged to the case history. */}
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="text-sm font-semibold text-foreground">Acción tomada <span className="text-red-600">*</span></div>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAction(a)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    action === a ? "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300" : "hover:bg-muted"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              rows={2}
              placeholder="Describe la acción tomada para atender el SOS…"
              className="mt-2 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
          </div>
        </div>

        {/* Footer — acknowledge (disabled until an action is recorded). */}
        <div className="shrink-0 border-t bg-muted/30 p-4">
          <button
            onClick={handleAck}
            disabled={!action.trim() || saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-lg font-bold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Registrando…" : "RECONOCER Y SILENCIAR"}
          </button>
          {!action.trim() && (
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              Registra la acción tomada para poder silenciar la alarma.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
