import AppLayout from "@/layouts/app-layout";
import { Clock } from "lucide-react";

/**
 * Web Time Clock (kiosk/manual punch). Phase 2 — the backend clock-in/out API
 * already exists (POST /tenant/:id/guard/me/clock-in|out); this page will drive
 * it from the web. Guards currently punch from the mobile worker app.
 */
export default function NominaTimeClock() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C8860A]/15 text-[#C8860A]">
          <Clock size={26} />
        </span>
        <h1 className="text-xl font-bold text-foreground">Reloj de Asistencia (web)</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          El reloj web (marcación tipo kiosco desde el panel) llega en la siguiente fase. Por ahora,
          los guardias marcan entrada/salida desde la app móvil; sus registros aparecen en
          <strong> Registros de Asistencia</strong>.
        </p>
      </div>
    </AppLayout>
  );
}
