import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Radio, X, Play, Square, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { radioCheckService } from "@/lib/api/radioCheckService";
import { useRadioRealtime } from "./RadioRealtimeProvider";

const POS_KEY = "radioWidgetPos";
const loadPos = () => { try { return JSON.parse(localStorage.getItem(POS_KEY) || "null") || { x: 0, y: 0 }; } catch { return { x: 0, y: 0 }; } };

/** A short WebAudio chime — avoids bundling an audio asset. */
function chime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.36);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* ignore */ }
}

export default function RadioDispatchWidget() {
  const navigate = useNavigate();
  const { version, lastEvent, connected } = useRadioRealtime();
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null); // console payload
  const [running, setRunning] = useState<any>(null); // running session
  const pos = loadPos();
  const x = useMotionValue(pos.x);
  const y = useMotionValue(pos.y);
  const lastSeen = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const c = await radioCheckService.getConsole();
      if (!mountedRef.current) return;
      setPermitted(true);
      setData(c);
      if (c?.runningSessionId) {
        const s = await radioCheckService.getSession(c.runningSessionId).catch(() => null);
        if (!mountedRef.current) return;
        setRunning(s?.session || null);
      } else { setRunning(null); }
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (e?.response?.status === 403 || e?.response?.status === 401) setPermitted(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const id = setInterval(refresh, 20000); return () => clearInterval(id); }, [refresh]);
  // React to live radio.* events.
  useEffect(() => { if (version > 0) refresh(); }, [version, refresh]);
  useEffect(() => {
    if (!lastEvent || lastEvent.id === lastSeen.current) return;
    lastSeen.current = lastEvent.id;
    if (lastEvent.eventType === "radio.reply") {
      chime();
      toast.message(`Respuesta: ${lastEvent.body || "puesto"}`, { description: lastEvent.payload?.classification === "incident" ? "⚠️ Posible incidente" : undefined });
    }
  }, [lastEvent]);

  const start = async () => {
    setBusy(true);
    try { await radioCheckService.start("all"); toast.success("Pase de novedades iniciado"); await refresh(); }
    catch { toast.error("No se pudo iniciar el pase"); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!running) return;
    setBusy(true);
    try { await radioCheckService.cancelSession(running.id); await refresh(); }
    catch { /* ignore */ } finally { setBusy(false); }
  };

  if (permitted !== true) return null;

  const total = running?.totalStations || 0;
  const done = (running?.respondedCount || 0) + (running?.noResponseCount || 0);
  const stations = data?.stations || [];
  const pending = stations.filter((s: any) => s.latest && (s.latest.status === "notified" || s.latest.status === "pending")).length;

  return (
    <motion.div
      drag
      dragMomentum={false}
      style={{ x, y }}
      onDragEnd={() => { try { localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() })); } catch { /* ignore */ } }}
      className="fixed bottom-5 right-5 z-[70] select-none"
    >
      {open ? (
        <div className="w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 cursor-grab active:cursor-grabbing">
            <Radio size={16} className="text-amber-500" />
            <span className="flex-1 text-sm font-semibold">Pase de novedades</span>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-400"}`} title={connected ? "En línea" : "Sin conexión"} />
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X size={15} /></button>
          </div>

          <div className="space-y-3 p-3">
            {running ? (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{done >= total ? "Finalizando…" : `Puesto ${Math.min(done + 1, total)} de ${total}`}</span>
                    <span className="text-muted-foreground">{running.respondedCount || 0} ✓ · {running.noResponseCount || 0} ✕</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
                  </div>
                </div>
                <button onClick={cancel} disabled={busy} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />} Cancelar pase
                </button>
              </>
            ) : (
              <button onClick={start} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Iniciar pase ({stations.length})
              </button>
            )}

            <button onClick={() => { setOpen(false); navigate("/radio"); }} className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Abrir consola de radio <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-amber-500 text-white shadow-2xl hover:bg-amber-600 cursor-grab active:cursor-grabbing"
          aria-label="Pase de novedades"
        >
          <Radio size={24} />
          {(running || pending > 0) && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
              {running ? (pending || "•") : pending}
            </span>
          )}
        </button>
      )}
    </motion.div>
  );
}
