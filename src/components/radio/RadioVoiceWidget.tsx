import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Radio, Mic, Users, X, Loader2, Volume2, Megaphone, Square } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { radioCheckService } from "@/lib/api/radioCheckService";
import {
  subscribeRadio,
  getRadioSnapshot,
  setRadioOn,
  setRadioSelf,
  setWidgetOpen,
  restoreRadio,
  radioResume,
  radioStartTalk,
  radioStopTalk,
} from "@/lib/radioVoiceManager";

/**
 * Floating radio panel, opened from the header radio icon. One general channel
 * with an on/off switch — when on, the dispatcher listens and can push-to-talk,
 * and the channel keeps running (in the module singleton) across navigation even
 * after this panel is closed.
 */
export default function RadioVoiceWidget() {
  const { user } = useAuth();
  const myId = (user as any)?.id || (user as any)?._id;
  const snap = useSyncExternalStore(subscribeRadio, getRadioSnapshot);
  const pressedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Pase de novedades (roll call) — started from this same widget.
  const [paseBusy, setPaseBusy] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [pasePermitted, setPasePermitted] = useState<boolean | null>(null);

  const refreshPase = async () => {
    try {
      const c: any = await radioCheckService.getConsole();
      if (!mountedRef.current) return;
      setPasePermitted(true);
      setRunningId(c?.runningSessionId || null);
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (e?.response?.status === 403 || e?.response?.status === 401) setPasePermitted(false);
    }
  };
  useEffect(() => { if (snap.open) refreshPase(); }, [snap.open]);

  const startPase = async () => {
    setPaseBusy(true);
    try {
      await radioCheckService.start("all");
      toast.success("Pase de novedades iniciado");
      await refreshPase();
    } catch { toast.error("No se pudo iniciar el pase"); }
    finally { setPaseBusy(false); }
  };
  const endPase = async () => {
    if (!runningId) return;
    setPaseBusy(true);
    try { await radioCheckService.cancelSession(runningId); setRunningId(null); }
    catch { toast.error("No se pudo finalizar el pase"); }
    finally { setPaseBusy(false); }
  };

  useEffect(() => {
    setRadioSelf(myId);
    restoreRadio();
    // Open the panel once so the on/off switch is discoverable. After the user
    // sees/closes it, they reopen via the header radio icon.
    try {
      if (localStorage.getItem("radioWidgetSeen") !== "1") {
        setWidgetOpen(true);
        localStorage.setItem("radioWidgetSeen", "1");
      }
    } catch { /* ignore */ }
  }, [myId]);

  const someoneElseTalking = !!snap.speaker && snap.speaker.userId !== myId;
  const connecting = snap.on && snap.state === "connecting";
  const live = snap.on && snap.joined;

  const toggleOn = () => {
    radioResume();
    setRadioOn(!snap.on);
  };

  const onPttDown = async (e: React.PointerEvent) => {
    if (!live || someoneElseTalking) return;
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    pressedRef.current = true;
    radioResume();
    const r = await radioStartTalk();
    if (!pressedRef.current) { radioStopTalk(); return; }
    void r;
  };
  const onPttUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    pressedRef.current = false;
    radioStopTalk();
  };

  if (!snap.open) return null;

  return (
    <div
      onPointerDown={() => radioResume()}
      className="fixed right-3 top-16 z-[80] w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card shadow-2xl"
    >
      {/* Header + on/off switch */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Radio size={16} className={snap.on ? "text-amber-500" : "text-muted-foreground"} />
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">Canal general</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {snap.on ? (live ? "En vivo · todos pueden hablar" : connecting ? "Conectando…" : "Sin conexión") : "Apagado"}
          </p>
        </div>
        {/* On/off switch */}
        <button
          role="switch"
          aria-checked={snap.on}
          onClick={toggleOn}
          title={snap.on ? "Apagar canal" : "Encender canal"}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${snap.on ? "bg-emerald-500" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${snap.on ? "left-[22px]" : "left-0.5"}`} />
        </button>
        <button onClick={() => setWidgetOpen(false)} title="Cerrar" className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <X size={16} />
        </button>
      </div>

      {!snap.on ? (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <Volume2 size={26} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Enciende el canal general para escuchar y hablar con los guardias en tiempo real. Sigue activo aunque cierres esta ventana.
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          {/* Who's talking */}
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${snap.speaker ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
            <span>
              {snap.speaker
                ? `${snap.speaker.userId === myId ? "Estás hablando" : `${snap.speaker.name} está hablando`}…`
                : live ? "Canal libre" : "Conectando…"}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-normal">
              {connecting ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />} {snap.roster.length}
            </span>
          </div>

          {/* PTT */}
          <button
            onPointerDown={onPttDown}
            onPointerUp={onPttUp}
            onPointerCancel={onPttUp}
            onContextMenu={(e) => e.preventDefault()}
            disabled={!live || someoneElseTalking}
            style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" } as any}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-40 ${snap.talking ? "bg-red-500" : "bg-amber-500 hover:bg-amber-600"}`}
          >
            <Mic size={18} /> {snap.talking ? "Transmitiendo…" : someoneElseTalking ? "Canal ocupado" : "Mantén para hablar"}
          </button>

          {snap.hint && <p className="text-center text-[11px] text-red-600">{snap.hint}</p>}

          {/* Roster */}
          {snap.roster.length > 0 && (
            <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {snap.roster.map((m) => (
                <div key={m.userId} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span className={`h-2 w-2 rounded-full ${snap.speaker?.userId === m.userId ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                  <span className="flex-1 truncate">{m.name}{m.userId === myId ? " (tú)" : ""}</span>
                  {snap.speaker?.userId === m.userId && <Mic size={12} className="text-amber-500" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pase de novedades (roll call) — started from this same widget. */}
      {pasePermitted !== false && (
        <div className="border-t border-border p-3">
          {runningId ? (
            <button
              onClick={endPase}
              disabled={paseBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50"
            >
              {paseBusy ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} Finalizar pase de novedades
            </button>
          ) : (
            <button
              onClick={startPase}
              disabled={paseBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
            >
              {paseBusy ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} Iniciar pase de novedades
            </button>
          )}
        </div>
      )}
    </div>
  );
}
