import { useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Shield, UserCog, AlertTriangle, Building2, Timer, Route, CheckCircle2,
  Activity, Cpu, Radio, Map as MapIcon, Maximize2, LayoutDashboard, type LucideIcon,
} from "lucide-react";
import { Stagger, EmptyState } from "@/components/kit";
import AppLayout from "@/layouts/app-layout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import "./control-center.css";
import { useControlCenter } from "./useControlCenter";
import { useDemoData } from "./demoData";
import { loadPrefs, savePrefs, type DashboardPrefs } from "./prefs";
import { GlassCard, SectionHeader, StatusDot } from "./components/primitives";
import { KpiCard } from "./components/KpiCard";
import { OperationsMap } from "./components/OperationsMap";
import { RevenuePanel } from "./components/RevenuePanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { AreaChart } from "./components/AreaChart";
import { Toolbar, type RangeKey } from "./components/Toolbar";
import { CustomizePanel } from "./components/CustomizePanel";
import { DashboardErrorBoundary } from "./components/ErrorBoundary";
import { HEALTH_ROUTES } from "./navigation";

const KPI_ICON: Record<string, LucideIcon> = {
  onDuty: User, stations: Shield, supervisors: UserCog, openIncidents: AlertTriangle,
  clients: Building2, response: Timer, patrolsToday: Route, compliance: CheckCircle2,
};

export default function ControlCenter() {
  usePageTitle("Panel de control");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<DashboardPrefs>(() => loadPrefs());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("12m");
  const [demo, setDemo] = useState<boolean>(() => {
    try { return localStorage.getItem("cc_demo") === "1"; } catch { return false; }
  });
  const toggleDemo = (v: boolean) => {
    setDemo(v);
    try { localStorage.setItem("cc_demo", v ? "1" : "0"); } catch { /* ignore */ }
  };

  const live = useControlCenter(prefs.liveTracking ? prefs.locationIntervalSec : 3600);
  const demoData = useDemoData(demo);
  // In demo mode, show the populated sample so a new tenant can preview the UI.
  const data = demo ? { ...demoData, refresh: live.refresh } : live;

  const openFullMap = () =>
    window.open(`${window.location.origin}/dashboard/operations-map`, "_blank", "noopener,noreferrer");

  const accentStyle = useMemo(() => ({ ["--cc-accent" as any]: prefs.accent }), [prefs.accent]);
  const legend = [
    { k: "tenant", label: "Sede" }, { k: "station", label: "Puestos" },
    { k: "guard", label: "Vigilantes" }, { k: "supervisor", label: "Supervisores" },
  ] as const;

  return (
    <AppLayout>
      <DashboardErrorBoundary>
      <div className="cc-root min-h-screen" style={accentStyle as any}>
        <div className="cc-backdrop">
          <div className="cc-blob" style={{ width: 460, height: 460, top: -120, right: -80, background: prefs.accent }} />
          <div className="cc-blob" style={{ width: 380, height: 380, bottom: -120, left: -60, background: "#38bdf8" }} />
        </div>

        <div className="relative z-10 p-4 sm:p-6">
          <Toolbar
            range={range} onRange={setRange} onRefresh={data.refresh}
            onCustomize={() => setCustomizeOpen(true)}
            sseConnected={data.health.sseConnected} lastSync={data.health.lastSync}
            demo={demo} onDemo={toggleDemo}
          />

          {data.error === "no-tenant" ? (
            <GlassCard className="p-4" hover={false}>
              <EmptyState
                icon={<LayoutDashboard />}
                title="Selecciona un negocio"
                description="Elige un negocio (inquilino) para ver el panel de control en tiempo real."
              />
            </GlassCard>
          ) : (
            <>
              {/* KPI grid */}
              <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                {data.kpis.map((k, i) => (
                  <KpiCard key={k.key} kpi={k} icon={KPI_ICON[k.key]} index={i} />
                ))}
              </Stagger>

              {/* Map + side column */}
              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                <GlassCard className="xl:col-span-2 overflow-hidden" hover={false}>
                  <SectionHeader title="Operaciones en tiempo real" icon={<MapIcon size={16} />} live
                    right={
                      <div className="flex flex-wrap items-center gap-3 pr-1">
                        {legend.map((l) => (
                          <span key={l.k} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ background: prefs.pinColors[l.k as keyof typeof prefs.pinColors] }} />
                            {l.label}
                          </span>
                        ))}
                        <button
                          onClick={openFullMap}
                          title="Abrir en pantalla completa (nueva pestaña)"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border/60 bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    } />
                  <div className="relative">
                    <OperationsMap entities={data.entities} prefs={prefs} height={480} defaultCenter={data.defaultCenter} />
                    {/* Click anywhere on the preview → open the interactive map full screen. */}
                    <button
                      onClick={openFullMap}
                      title="Abrir en pantalla completa (nueva pestaña)"
                      aria-label="Pantalla completa"
                      className="group absolute inset-0 flex items-end justify-end p-3"
                    >
                      <span className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-xs font-medium text-white/90 opacity-0 transition group-hover:opacity-100">
                        <Maximize2 size={13} /> Pantalla completa
                      </span>
                    </button>
                  </div>
                </GlassCard>

                <div className="flex flex-col gap-5">
                  <ActivityFeed items={data.activity} live={data.health.sseConnected} />
                  <SystemHealth data={data} />
                </div>
              </div>

              {/* Revenue + trends */}
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2"><RevenuePanel revenue={data.revenue} /></div>
                <GlassCard className="overflow-hidden" onClick={() => navigate("/activities")} ariaLabel="Ver incidentes">
                  <SectionHeader title="Incidentes (tendencia)" icon={<AlertTriangle size={16} />} />
                  <div className="px-2 pb-3">
                    <AreaChart data={data.incidentsTrend} color="#ef4444" height={150} />
                  </div>
                </GlassCard>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <GlassCard className="overflow-hidden" onClick={() => navigate("/analytics/reporting")} ariaLabel="Ver analítica de tiempo de respuesta">
                  <SectionHeader title="Tiempo de respuesta (min)" icon={<Timer size={16} />} />
                  <div className="px-2 pb-3"><AreaChart data={data.responseTrend} color="#38bdf8" height={150} valueSuffix=" min" /></div>
                </GlassCard>
                <GlassCard className="overflow-hidden" onClick={() => navigate("/clients")} ariaLabel="Ver clientes">
                  <SectionHeader title="Adquisición de clientes" icon={<Building2 size={16} />} />
                  <div className="px-2 pb-3"><AreaChart data={data.acquisitionTrend} color={prefs.accent} height={150} /></div>
                </GlassCard>
              </div>

              {data.gaps.length > 0 && (
                <GlassCard className="mt-5 p-4" hover={false}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400/80">Pendientes de backend</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {data.gaps.map((g, i) => <li key={i} className="flex gap-2"><span className="text-amber-400/60">•</span>{g}</li>)}
                  </ul>
                </GlassCard>
              )}
            </>
          )}
        </div>

        <CustomizePanel
          open={customizeOpen} value={prefs} onClose={() => setCustomizeOpen(false)}
          onSave={(p) => { setPrefs(p); savePrefs(p); setCustomizeOpen(false); }}
        />
      </div>
      </DashboardErrorBoundary>
    </AppLayout>
  );
}

function SystemHealth({ data }: { data: ReturnType<typeof useControlCenter> }) {
  const navigate = useNavigate();
  const items = [
    { icon: Radio, label: "Tiempo real (SSE)", value: data.health.sseConnected ? "Conectado" : "Sondeo", ok: data.health.sseConnected },
    { icon: Cpu, label: "Dispositivos en línea", value: String(data.health.onlineDevices), ok: data.health.onlineDevices > 0 },
    { icon: Activity, label: "Puestos / Clientes", value: `${data.counts.stations ?? 0} / ${data.counts.clients ?? 0}`, ok: true },
    { icon: User, label: "Equipo administrativo", value: String(data.counts.team ?? 0), ok: true },
  ];
  return (
    <GlassCard>
      <SectionHeader title="Estado del sistema" icon={<Cpu size={16} />} />
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        {items.map((it) => {
          const to = HEALTH_ROUTES[it.label];
          return (
            <div
              key={it.label}
              {...(to
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": it.label,
                    onClick: () => navigate(to),
                    onKeyDown: (e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(to); }
                    },
                  }
                : {})}
              className={`rounded-lg bg-white/[0.03] p-3 ${to ? "cursor-pointer transition-colors hover:bg-white/[0.06]" : ""}`}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <it.icon size={14} /><span className="text-[11px]">{it.label}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusDot status={it.ok ? "online" : "delayed"} />
                <span className="text-sm font-semibold text-foreground">{it.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
