import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { toast } from "sonner";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { History, Map as MapIcon, FileSpreadsheet, Loader2, MapPin } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section, EmptyState } from "@/components/kit";
import { securityGuardService } from "@/lib/api/securityGuardService";
import TrailMap, { type TrailPoint } from "./TrailMap";

type MapType = "roadmap" | "satellite" | "hybrid" | "terrain";

interface GuardOpt { id: string; name: string; }

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TrackingHistoryPage() {
  const [guards, setGuards] = useState<GuardOpt[]>([]);
  const [guardId, setGuardId] = useState<string>("");
  const [from, setFrom] = useState<string>(() => ymd(new Date()));
  const [to, setTo] = useState<string>(() => ymd(new Date()));
  const [mapType, setMapType] = useState<MapType>("roadmap");
  const [points, setPoints] = useState<TrailPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load the vigilantes list once for the selector.
  useEffect(() => {
    (async () => {
      try {
        const res: any = await securityGuardService.list({ limit: 1000 });
        const rows: any[] = Array.isArray(res) ? res : res?.rows || [];
        setGuards(
          rows
            .map((g) => ({ id: g.id, name: g.fullName || g.name || g.email || "Vigilante" }))
            .filter((g) => g.id),
        );
      } catch {
        toast.error("No se pudo cargar la lista de vigilantes");
      }
    })();
  }, []);

  // Clear the drawn trail when the selection changes so the map + CSV never show
  // a previous guard's route under a new guard's name (the fetch is manual).
  useEffect(() => { setPoints([]); setLoaded(false); }, [guardId, from, to]);

  const loadTrail = async () => {
    if (!guardId) { toast.error("Selecciona un vigilante"); return; }
    setLoading(true);
    try {
      const pts = await securityGuardService.trail(guardId, {
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
        limit: 5000,
      });
      setPoints(pts);
      setLoaded(true);
      if (!pts.length) toast.info("Sin recorrido registrado en ese rango");
    } catch {
      toast.error("No se pudo cargar el recorrido");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!points.length) return;
    const csvCell = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "Fecha/Hora,Latitud,Longitud,Velocidad(m/s),Precisión(m),Batería(%)";
    const body = points
      .map((p) => [new Date(p.at).toLocaleString("es-EC"), p.lat, p.lng, p.speed ?? "", p.accuracy ?? "", p.battery ?? ""].map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recorrido_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const guardName = useMemo(() => guards.find((g) => g.id === guardId)?.name || "", [guards, guardId]);

  return (
    <AppLayout>
      <PageContainer width="wide" className="p-4 sm:p-6">
        <Breadcrumb
          items={[
            { label: "Panel de control", path: "/dashboard" },
            { label: "Historial de seguimiento" },
          ]}
        />

        <PageHeader
          icon={<History />}
          title="Historial de seguimiento"
          subtitle="Reproduce el recorrido GPS real de tus vigilantes por rango de fechas."
          actions={
            <Button variant="ghost" size="icon" onClick={exportCsv} disabled={!points.length} aria-label="Exportar">
              <FileSpreadsheet className="h-5 w-5 text-foreground" />
            </Button>
          }
        />

        {/* Filters */}
        <Section title="Filtros" icon={<MapPin size={16} />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Vigilante</label>
              <Select value={guardId} onValueChange={setGuardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vigilante" />
                </SelectTrigger>
                <SelectContent>
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Desde</label>
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Hasta</label>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex items-end">
              <Button variant="brand" className="w-full gap-2" onClick={loadTrail} disabled={loading || !guardId}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapIcon className="h-4 w-4" />}
                Ver recorrido
              </Button>
            </div>
          </div>
        </Section>

        {/* Map + points */}
        <Section
          title={guardName ? `Recorrido · ${guardName}` : "Vista del mapa"}
          icon={<MapIcon size={16} />}
          action={
            <Select value={mapType} onValueChange={(v) => setMapType(v as MapType)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="roadmap">Hoja de ruta</SelectItem>
                <SelectItem value="satellite">Satélite</SelectItem>
                <SelectItem value="hybrid">Híbrido</SelectItem>
                <SelectItem value="terrain">Terreno</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="mt-1 flex h-[440px] overflow-hidden rounded-2xl border">
            <div className="flex-[2] bg-muted">
              {loaded ? (
                <TrailMap points={points} mapType={mapType} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={<MapIcon />}
                    title="Selecciona un vigilante y un rango"
                    description="Elige un vigilante y las fechas, luego pulsa «Ver recorrido» para dibujar su ruta GPS."
                    className="border-none py-0"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-[1] flex-col border-l bg-card">
              <div className="flex border-b bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground">
                <span className="flex-1">Punto</span>
                <span className="flex-1">Fecha/Hora</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {points.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
                    {loaded ? "Sin puntos en este rango" : "—"}
                  </div>
                ) : (
                  points.map((p, i) => (
                    <div key={i} className="flex items-center border-b border-border/30 px-4 py-2 text-xs">
                      <span className="flex-1 tabular-nums text-muted-foreground">#{i + 1}</span>
                      <span className="flex-1 tabular-nums text-foreground">{new Date(p.at).toLocaleString("es-EC", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))
                )}
              </div>
              {points.length > 0 && (
                <div className="border-t px-4 py-2 text-xs text-muted-foreground">{points.length} punto(s)</div>
              )}
            </div>
          </div>
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
