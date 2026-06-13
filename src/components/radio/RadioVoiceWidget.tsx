import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Radio, Mic, Power, Users, ChevronDown, Loader2, Volume2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeRadio,
  getRadioSnapshot,
  setRadioOn,
  setRadioSelf,
  restoreRadio,
  radioResume,
  radioStartTalk,
  radioStopTalk,
} from "@/lib/radioVoiceManager";

/**
 * Persistent floating radio widget. Toggle the open channel on; it then stays
 * connected and listening (via the module-level manager) while you navigate the
 * CRM. Collapse it to a bubble — the channel keeps running.
 */
export default function RadioVoiceWidget() {
  const { user } = useAuth();
  const myId = (user as any)?.id || (user as any)?._id;
  const snap = useSyncExternalStore(subscribeRadio, getRadioSnapshot);
  const [expanded, setExpanded] = useState(false);
  const pressedRef = useRef(false);

  // Identify self + restore the on-state once.
  useEffect(() => {
    setRadioSelf(myId);
    restoreRadio();
  }, [myId]);

  const someoneElseTalking = !!snap.speaker && snap.speaker.userId !== myId;
  const connecting = snap.on && snap.state === "connecting";
  const live = snap.on && snap.joined;

  const toggle = () => {
    radioResume();
    setRadioOn(!snap.on);
    if (!snap.on) setExpanded(true); // expand when turning on
  };

  const onPttDown = async (e: React.PointerEvent) => {
    if (!live || someoneElseTalking) return;
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    pressedRef.current = true;
    radioResume();
    const r = await radioStartTalk();
    if (!pressedRef.current) { radioStopTalk(); return; }
    if (!r.ok && r.busyWith) { /* manager surfaces hint via state */ }
  };
  const onPttUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    pressedRef.current = false;
    radioStopTalk();
  };

  // ----- Collapsed bubble -----
  if (!expanded) {
    const ring =
      snap.speaker ? "ring-amber-400 animate-pulse" : live ? "ring-emerald-500" : snap.on ? "ring-amber-400" : "ring-transparent";
    return (
      <button
        onClick={() => { radioResume(); setExpanded(true); }}
        title={snap.on ? "Radio — Canal general" : "Radio (apagado)"}
        className={`fixed bottom-4 left-4 z-[70] grid h-14 w-14 place-items-center rounded-full border border-border bg-card shadow-lg ring-2 ${ring} transition-all`}
      >
        <Radio size={22} className={snap.on ? "text-amber-500" : "text-muted-foreground"} />
        {snap.on && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
            {snap.roster.length || ""}
          </span>
        )}
        {snap.speaker && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
            <Mic size={9} className="inline" />
          </span>
        )}
      </button>
    );
  }

  // ----- Expanded panel -----
  return (
    <div
      onPointerDown={() => radioResume()}
      className="fixed bottom-4 left-4 z-[70] w-72 rounded-2xl border border-border bg-card shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Radio size={16} className={snap.on ? "text-amber-500" : "text-muted-foreground"} />
        <span className="flex-1 text-sm font-semibold">Radio · Canal general</span>
        <button
          onClick={toggle}
          title={snap.on ? "Apagar radio" : "Encender radio"}
          className={`grid h-7 w-7 place-items-center rounded-full ${snap.on ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}
        >
          <Power size={15} />
        </button>
        <button onClick={() => setExpanded(false)} title="Minimizar" className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <ChevronDown size={16} />
        </button>
      </div>

      {!snap.on ? (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <Volume2 size={26} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Enciende el radio para escuchar y hablar con los guardias en el canal general en tiempo real.
          </p>
          <button onClick={toggle} className="mt-1 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
            <Power size={15} /> Encender radio
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${live ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
              {connecting ? <Loader2 size={12} className="animate-spin" /> : <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-muted-foreground"}`} />}
              {connecting ? "Conectando…" : live ? "En vivo" : "Sin conexión"}
            </span>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              <Users size={12} /> {snap.roster.length}
            </span>
          </div>

          {/* Who's talking */}
          <div className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${snap.speaker ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
            {snap.speaker
              ? `${snap.speaker.userId === myId ? "Estás hablando" : `${snap.speaker.name} está hablando`}…`
              : live ? "Canal libre" : "Conectando…"}
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
    </div>
  );
}
