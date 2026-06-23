import { useEffect, type ReactNode } from "react";
import { Siren, Phone, MapPin, User, Building2, Clock } from "lucide-react";
import { startPanicAlarm, stopPanicAlarm } from "@/lib/notificationSound";
import type { PlatformNotification } from "@/hooks/useNotificationStream";

/**
 * Full-screen, impossible-to-miss red alert shown when a guard triggers the
 * panic button (eventType `panic.alert`). Surfaces everything dispatch needs to
 * act — station, address, site phone, guard, live coordinates — and wails a loud
 * siren until an operator acknowledges it. Multiple concurrent panics stack;
 * acknowledging reveals the next.
 */
export function PanicAlertOverlay({
  alerts,
  onDismiss,
}: {
  alerts: PlatformNotification[];
  onDismiss: (id: string) => void;
}) {
  const active = alerts.length > 0;

  // Siren wails while any panic is on screen; stops the moment the last is
  // acknowledged (or the component unmounts).
  useEffect(() => {
    if (!active) return;
    const stop = startPanicAlarm();
    return () => {
      stop();
      stopPanicAlarm();
    };
  }, [active]);

  if (!active) return null;

  const latest = alerts[0];
  const p: any = latest.payload || {};
  // Only trust http(s)/geo map links from the alert payload; never allow
  // javascript:/data: schemes to reach the href on this high-trust overlay.
  const safeMapsUrl = typeof p.mapsUrl === "string" && /^(https?:|geo:)/i.test(p.mapsUrl)
    ? p.mapsUrl
    : null;
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

  const Row = ({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) =>
    value ? (
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-white/70">{icon}</span>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/60">{label}</div>
          <div className="text-lg font-semibold text-white">{value}</div>
        </div>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-950/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Pulsing red frame */}
      <div className="absolute inset-0 ring-[6px] ring-inset ring-red-500 animate-pulse pointer-events-none" />

      <div className="relative w-full max-w-lg mx-4 rounded-3xl bg-red-600 shadow-2xl border border-red-400/50 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 bg-red-700">
          <Siren size={40} className="text-white animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="text-2xl font-black tracking-tight text-white leading-none">ALERTA DE PÁNICO</div>
            <div className="text-sm text-red-100 mt-1">Un vigilante activó el botón de emergencia</div>
          </div>
          {alerts.length > 1 && (
            <span className="ml-auto shrink-0 rounded-full bg-white text-red-700 text-sm font-bold px-3 py-1">
              +{alerts.length - 1}
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <Row icon={<Building2 size={20} />} label="Puesto" value={p.stationName || p.siteName} />
          <Row icon={<MapPin size={20} />} label="Ubicación" value={p.address || p.location} />
          <Row icon={<User size={20} />} label="Vigilante" value={p.guardName} />
          <Row icon={<Phone size={20} />} label="Teléfono del sitio" value={p.phone} />
          <Row icon={<Clock size={20} />} label="Hora" value={when} />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href="tel:911"
              className="flex items-center justify-center gap-2 rounded-xl bg-white text-red-700 font-bold py-3 hover:bg-red-50 transition-colors"
            >
              <Phone size={18} /> Llamar 911
            </a>
            {safeMapsUrl ? (
              <a
                href={safeMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-red-800 text-white font-bold py-3 hover:bg-red-900 transition-colors"
              >
                <MapPin size={18} /> Ver mapa
              </a>
            ) : (
              <div className="flex items-center justify-center rounded-xl bg-red-800/50 text-red-200 text-sm py-3">
                Sin coordenadas
              </div>
            )}
          </div>

          {p.phone && (
            <a
              href={`tel:${String(p.phone).replace(/[^+\d]/g, "")}`}
              className="block text-center text-sm text-red-100 underline underline-offset-2"
            >
              Llamar al sitio: {p.phone}
            </a>
          )}
        </div>

        <button
          onClick={() => onDismiss(latest.id)}
          className="w-full py-4 bg-red-900 text-white font-bold text-lg hover:bg-red-950 transition-colors"
        >
          RECONOCER Y SILENCIAR
        </button>
      </div>
    </div>
  );
}
