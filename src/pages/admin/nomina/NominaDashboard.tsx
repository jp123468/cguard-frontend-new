import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import attendanceService from "@/lib/api/attendanceService";
import {
  CalendarCheck,
  UserCheck,
  Clock,
  AlertTriangle,
  LogOut,
  Timer,
  CheckSquare,
  Percent,
} from "lucide-react";

interface Summary {
  scheduledToday: number;
  clockedInNow: number;
  lateToday: number;
  noShowsToday: number;
  missedClockouts: number;
  overtimeToday: number;
  pendingApprovals: number;
  attendancePct: number | null;
}

const CARDS: { key: keyof Summary; label: string; icon: any; accent: string }[] = [
  { key: "scheduledToday", label: "Programados hoy", icon: CalendarCheck, accent: "text-[#C8860A]" },
  { key: "clockedInNow", label: "En servicio ahora", icon: UserCheck, accent: "text-emerald-500" },
  { key: "lateToday", label: "Llegadas tarde", icon: Clock, accent: "text-amber-500" },
  { key: "noShowsToday", label: "Inasistencias", icon: AlertTriangle, accent: "text-red-500" },
  { key: "missedClockouts", label: "Sin marcar salida", icon: LogOut, accent: "text-orange-500" },
  { key: "overtimeToday", label: "Tiempo extra", icon: Timer, accent: "text-sky-500" },
  { key: "pendingApprovals", label: "Aprobaciones pendientes", icon: CheckSquare, accent: "text-violet-500" },
  { key: "attendancePct", label: "Asistencia", icon: Percent, accent: "text-emerald-500" },
];

export default function NominaDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    attendanceService
      .dashboard()
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "Error al cargar el panel"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Nómina · Asistencia</h1>
            <p className="text-sm text-muted-foreground">Resumen de asistencia de hoy</p>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/30"
          >
            Actualizar
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CARDS.map((c) => {
            const Icon = c.icon;
            const raw = data ? (data[c.key] as number | null) : null;
            const value =
              c.key === "attendancePct" ? (raw == null ? "—" : `${raw}%`) : raw == null ? "—" : raw;
            return (
              <div
                key={c.key}
                className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-muted/40 ${c.accent}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">
                  {loading ? "…" : value}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.label}</div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Las excepciones (tarde, inasistencia, sin marcar salida) se detectan automáticamente cada
          pocos minutos y aparecen en <strong>Excepciones</strong> y <strong>Aprobaciones</strong>.
        </p>
      </div>
    </AppLayout>
  );
}
