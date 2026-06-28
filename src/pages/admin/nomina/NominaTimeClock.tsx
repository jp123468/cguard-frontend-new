import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, MapPin, LogIn, LogOut, Loader2 } from "lucide-react";
import attendanceService from "@/lib/api/attendanceService";

interface Station { id: string; stationName?: string; name?: string }

/**
 * Web Time Clock — kiosk-style punch for the logged-in guard, reusing the same
 * /guard/me clock-in/out API as the mobile app (geofence enforced server-side).
 */
export default function NominaTimeClock() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState("");
  const [notGuard, setNotGuard] = useState(false);

  const refresh = () => {
    setLoading(true);
    attendanceService
      .myStatus()
      .then((d: any) => {
        const sts: Station[] = d?.stations || [];
        setStations(sts);
        setIsClockedIn(!!d?.isClockedIn);
        if (sts[0]) setStationId((prev) => prev || sts[0].id);
        if (!d?.guard) setNotGuard(true);
      })
      .catch(() => setNotGuard(true))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const getPosition = (): Promise<{ latitude: number; longitude: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalización no disponible"));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        (e) => reject(new Error(e.message || "No se pudo obtener la ubicación")),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const doClockIn = async () => {
    if (!stationId) return toast.error("Selecciona un puesto");
    setBusy(true);
    try {
      const coords = await getPosition();
      const res: any = await attendanceService.clockIn({ stationId, ...coords });
      if (res && res.success === false) {
        toast.error(res.message || "No se pudo marcar entrada");
      } else {
        toast.success("Entrada registrada");
        refresh();
      }
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const doClockOut = async () => {
    setBusy(true);
    try {
      let coords: any = {};
      try { coords = await getPosition(); } catch { /* GPS optional on out */ }
      const res: any = await attendanceService.clockOut(coords);
      if (res && res.success === false) toast.error(res.message || "No se pudo marcar salida");
      else { toast.success("Salida registrada"); refresh(); }
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-3xl border border-border/50 bg-card p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Clock size={30} />
          </span>
          <h1 className="text-xl font-bold text-foreground">Reloj de Asistencia</h1>

          {loading ? (
            <div className="py-10 text-sm text-muted-foreground">Cargando…</div>
          ) : notGuard ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Este reloj es para vigilantes. Tu cuenta no tiene un perfil de vigilante asignado, por lo
              que no puedes marcar entrada/salida desde aquí.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Estado: {isClockedIn ? <span className="font-semibold text-emerald-600">En servicio</span> : <span className="font-semibold text-muted-foreground">Fuera de servicio</span>}
              </p>

              {!isClockedIn && (
                <div className="mt-5 text-left">
                  <label className="text-xs font-medium text-muted-foreground">
                    <MapPin className="mr-1 inline h-3.5 w-3.5" /> Puesto
                  </label>
                  <select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {stations.length === 0 && <option value="">Sin puestos asignados</option>}
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.stationName || s.name || s.id}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-6">
                {isClockedIn ? (
                  <Button onClick={doClockOut} disabled={busy} className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base">
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                    Marcar salida
                  </Button>
                ) : (
                  <Button onClick={doClockIn} disabled={busy || !stationId} className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-base">
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                    Marcar entrada
                  </Button>
                )}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Se solicitará tu ubicación; la geocerca se valida en el servidor.
              </p>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
