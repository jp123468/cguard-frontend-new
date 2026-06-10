import { useCallback, useEffect, useState } from "react";
import { Radio, Play, Square, Loader2, Settings2, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/layouts/app-layout";
import { radioCheckService, radioAudioSrc } from "@/lib/api/radioCheckService";
import { useRadioRealtime } from "@/components/radio/RadioRealtimeProvider";
import RadioLiveChannelPanel from "@/components/radio/RadioLiveChannelPanel";

const statusBadge: Record<string, { label: string; cls: string }> = {
  responded: { label: "Respondió", cls: "bg-emerald-500/15 text-emerald-600" },
  no_response: { label: "Sin respuesta", cls: "bg-red-500/15 text-red-600" },
  notified: { label: "Llamando…", cls: "bg-amber-500/15 text-amber-600" },
  pending: { label: "En cola", cls: "bg-zinc-500/15 text-zinc-500" },
  skipped: { label: "Sin guardia", cls: "bg-zinc-500/10 text-zinc-400" },
};
const classChip: Record<string, { label: string; cls: string }> = {
  incident: { label: "Incidente", cls: "bg-red-500/15 text-red-600" },
  novedad: { label: "Novedad", cls: "bg-amber-500/15 text-amber-600" },
  sin_novedad: { label: "Sin novedad", cls: "bg-emerald-500/15 text-emerald-600" },
};

export default function RadioDispatch() {
  const { version, connected } = useRadioRealtime();
  const [data, setData] = useState<any>(null);
  const [running, setRunning] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      const c = await radioCheckService.getConsole();
      setData(c);
      if (c?.runningSessionId) {
        const s = await radioCheckService.getSession(c.runningSessionId).catch(() => null);
        setRunning(s?.session || null);
        setEntries(s?.entries || []);
      } else { setRunning(null); setEntries([]); }
    } catch (e: any) {
      if (e?.response?.status === 403) toast.error("No tienes permiso para el módulo de radio.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); radioCheckService.getSettings().then(setSettings).catch(() => {}); }, [refresh]);
  useEffect(() => { const id = setInterval(refresh, 20000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { if (version > 0) refresh(); }, [version, refresh]);

  const start = async (scope: "all" | "station", stationId?: string) => {
    setBusy(true);
    try { await radioCheckService.start(scope, stationId); toast.success("Pase iniciado"); await refresh(); }
    catch { toast.error("No se pudo iniciar"); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!running) return; setBusy(true);
    try { await radioCheckService.cancelSession(running.id); await refresh(); } finally { setBusy(false); }
  };
  const escalate = async (entryId: string) => {
    try { await radioCheckService.escalate(entryId); toast.success("Marcado como incidente"); await refresh(); } catch { /* ignore */ }
  };
  const saveSettings = async () => {
    try { const s = await radioCheckService.saveSettings(settings); setSettings(s); toast.success("Configuración guardada"); }
    catch { toast.error("No se pudo guardar"); }
  };

  const stations = data?.stations || [];
  const total = running?.totalStations || 0;
  const done = (running?.respondedCount || 0) + (running?.noResponseCount || 0);
  // Merge running-session entries (richer: transcript/audio) over the console rows.
  const entryByStation: Record<string, any> = {};
  entries.forEach((e) => { entryByStation[e.stationId] = e; });

  return (
    <AppLayout>
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600"><Radio size={20} /></span>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Radio · Pase de novedades</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-400"}`} />
            {connected ? "En tiempo real" : "Reconectando…"}
          </p>
        </div>
        <button onClick={refresh} className="rounded-lg border border-border p-2 hover:bg-muted" title="Actualizar"><RefreshCw size={16} /></button>
        <button onClick={() => setShowSettings((v) => !v)} className="rounded-lg border border-border p-2 hover:bg-muted" title="Configuración"><Settings2 size={16} /></button>
        {running ? (
          <button onClick={cancel} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Square size={14} />} Cancelar
          </button>
        ) : (
          <button onClick={() => start("all")} disabled={busy || !stations.length} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Iniciar pase
          </button>
        )}
      </div>

      {showSettings && settings && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Pase automático</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /> Activado</label>
            <label className="text-sm">Intervalo (min)<input type="number" min={1} value={settings.intervalMinutes ?? 35} onChange={(e) => setSettings({ ...settings, intervalMinutes: +e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
            <label className="text-sm">Espera/puesto (seg)<input type="number" min={30} value={settings.perStationTimeoutSeconds ?? 180} onChange={(e) => setSettings({ ...settings, perStationTimeoutSeconds: +e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
            <label className="text-sm">Hora inicio<input type="time" value={settings.activeHoursStart ?? ""} onChange={(e) => setSettings({ ...settings, activeHoursStart: e.target.value || null })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
            <label className="text-sm">Hora fin<input type="time" value={settings.activeHoursEnd ?? ""} onChange={(e) => setSettings({ ...settings, activeHoursEnd: e.target.value || null })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
          </div>
          <label className="mt-3 block text-sm">Mensaje al puesto<textarea rows={2} value={settings.promptText ?? ""} onChange={(e) => setSettings({ ...settings, promptText: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" /></label>
          <button onClick={saveSettings} className="mt-3 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background">Guardar</button>
        </div>
      )}

      {running && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">{done >= total ? "Finalizando…" : `Puesto ${Math.min(done + 1, total)} de ${total}`}</span>
            <span className="text-muted-foreground">{running.respondedCount || 0} respondieron · {running.noResponseCount || 0} sin respuesta</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      <div className="mb-5"><RadioLiveChannelPanel /></div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {stations.map((s: any) => {
            const e = entryByStation[s.stationId] || s.latest;
            const st = e?.status as string | undefined;
            const badge = st ? statusBadge[st] : null;
            const cc = e?.classification ? classChip[e.classification] : null;
            return (
              <div key={s.stationId} className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.stationName}</p>
                    <p className="truncate text-xs text-muted-foreground">{(s.onDutyGuards || []).join(", ") || "Sin guardia en turno"}</p>
                  </div>
                  {cc && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cc.cls}`}>{cc.label}</span>}
                  {badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>}
                  <button onClick={() => start("station", s.stationId)} disabled={busy || !!running} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40" title="Llamar a este puesto"><Play size={13} /></button>
                </div>
                {e && (e.transcript || e.transcriptStatus === "pending" || e.hasAudio) && (
                  <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                    {e.transcript ? <p className="text-sm">{e.transcript}</p> : e.transcriptStatus === "pending" ? <p className="text-xs italic text-muted-foreground">Transcribiendo…</p> : null}
                    {e.hasAudio && e.audioUrl !== undefined && (
                      <audio controls preload="none" src={radioAudioSrc(e.audioUrl)} className="h-8 w-full max-w-xs" />
                    )}
                    {st === "responded" && e.classification !== "incident" && (
                      <button onClick={() => escalate(e.entryId || e.id)} className="flex items-center gap-1 text-[11px] text-red-600 hover:underline"><AlertTriangle size={12} /> Marcar como incidente</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!stations.length && <p className="py-10 text-center text-sm text-muted-foreground">No hay puestos configurados.</p>}
        </div>
      )}

      <RecentSessions />
    </div>
    </AppLayout>
  );
}

function RecentSessions() {
  const { version } = useRadioRealtime();
  const [rows, setRows] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => { radioCheckService.listSessions(10).then((r) => setRows(r?.rows || [])).catch(() => {}); }, [version]);
  const open = async (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    const d = await radioCheckService.getSession(id).catch(() => null);
    setDetail(d);
  };

  if (!rows.length) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><FileText size={15} /> Pases recientes</h2>
      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card">
            <button onClick={() => open(s.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleString()}</span>
              <span className="text-xs">{s.mode === "auto" ? "Automático" : "Manual"}</span>
              <span className="flex-1" />
              <span className="text-xs text-emerald-600">{s.respondedCount || 0}✓</span>
              <span className="text-xs text-red-600">{s.noResponseCount || 0}✕</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status === "completed" ? "bg-emerald-500/15 text-emerald-600" : s.status === "running" ? "bg-amber-500/15 text-amber-600" : "bg-zinc-500/15 text-zinc-500"}`}>{s.status}</span>
            </button>
            {openId === s.id && detail?.session?.id === s.id && (
              <div className="border-t border-border p-3 text-sm">
                {detail.session.summary ? <p className="whitespace-pre-wrap">{detail.session.summary}</p>
                  : <p className="text-xs italic text-muted-foreground">{detail.session.summaryStatus === "skipped" ? "Resumen no disponible (sin clave de IA)." : "Generando resumen…"}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
