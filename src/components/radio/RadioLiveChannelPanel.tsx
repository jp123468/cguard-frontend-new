import { useEffect, useRef, useState } from "react";
import { Mic, Loader2, Users, Radio, LogOut, Volume2 } from "lucide-react";
import { getAuthToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { VoiceChannel, type VoiceMember, type VoiceSpeaker, type VoiceState } from "@/lib/voiceChannel";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "";
const socketOrigin = () => { try { return new URL(API_URL || window.location.origin, window.location.origin).origin; } catch { return window.location.origin; } };

/**
 * Dispatcher side of the open live channel (Canal abierto). The dispatcher opts
 * in with "Unirse" (a user gesture, needed to start audio), then can listen +
 * push-to-talk on the same tenant-wide channel the guards use.
 */
export default function RadioLiveChannelPanel() {
  const { user } = useAuth();
  const myId = (user as any)?.id || (user as any)?._id;

  const vcRef = useRef<VoiceChannel | null>(null);
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [roster, setRoster] = useState<VoiceMember[]>([]);
  const [speaker, setSpeaker] = useState<VoiceSpeaker>(null);
  const [talking, setTalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => () => { vcRef.current?.disconnect(); vcRef.current = null; }, []);

  const join = async () => {
    setBusy(true);
    setHint(null);
    const tenantId = localStorage.getItem("tenantId") || "";
    const vc = new VoiceChannel();
    vcRef.current = vc;
    vc.connect({ url: socketOrigin(), path: "/api/socket.io", token: getAuthToken() || "", tenantId, selfId: myId }, {
      onState: setState,
      onPresence: setRoster,
      onSpeaker: setSpeaker,
      onError: (m) => setHint(m),
    });
    vc.resume(); // within the click gesture → iOS/Safari will allow audio
    // wait briefly for connect, then join
    const start = Date.now();
    const tick = setInterval(async () => {
      if (vc.connected) {
        clearInterval(tick);
        try { const r = await vc.join(); setRoster(r.roster); setSpeaker(r.speaker); setJoined(true); }
        catch { setHint("No se pudo unir al canal."); }
        setBusy(false);
      } else if (Date.now() - start > 6000) {
        clearInterval(tick); setBusy(false); setHint("Sin conexión al canal.");
      }
    }, 300);
  };

  const leave = () => { vcRef.current?.disconnect(); vcRef.current = null; setJoined(false); setRoster([]); setSpeaker(null); setTalking(false); };

  const someoneElseTalking = !!speaker && speaker.userId !== myId;
  const pressedRef = useRef(false);

  const beginTalk = async () => {
    const r = await vcRef.current?.startTalk();
    if (!pressedRef.current) { vcRef.current?.stopTalk(); return; }
    if (r?.ok) setTalking(true);
    else if (r?.busyWith) setHint(`${r.busyWith} está hablando`);
    else if (r?.error) setHint(r.error);
  };
  const onPttDown = (e: React.PointerEvent) => {
    if (someoneElseTalking) return;
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    pressedRef.current = true;
    setHint(null);
    void beginTalk();
  };
  const onPttUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    pressedRef.current = false;
    vcRef.current?.stopTalk();
    setTalking(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Radio size={16} className="text-amber-500" />
        <h2 className="flex-1 text-sm font-semibold">Canal abierto (voz en vivo)</h2>
        {joined && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"><Users size={12} /> {roster.length}</span>
        )}
      </div>

      {!joined ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Volume2 size={28} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Únete para escuchar y hablar con los vigilantes en tiempo real (push-to-talk).</p>
          <button onClick={join} disabled={busy} className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />} Unirse al canal
          </button>
          {hint && <p className="text-[11px] text-red-600">{hint}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${speaker ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
            {speaker ? `${speaker.userId === myId ? "Estás hablando" : `${speaker.name} está hablando`}…` : (state === "connected" ? "Canal libre" : "Conectando…")}
          </div>

          <div className="flex items-center justify-center gap-3 py-1">
            <button
              onPointerDown={onPttDown}
              onPointerUp={onPttUp}
              onPointerCancel={onPttUp}
              onContextMenu={(e) => e.preventDefault()}
              disabled={someoneElseTalking}
              style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" } as any}
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-colors disabled:opacity-40 ${talking ? "bg-red-500" : "bg-amber-500 hover:bg-amber-600"}`}
            >
              <Mic size={18} /> {talking ? "Transmitiendo…" : someoneElseTalking ? "Ocupado" : "Mantén para hablar"}
            </button>
            <button onClick={leave} className="rounded-lg border border-border p-2.5 text-muted-foreground hover:bg-muted" title="Salir del canal"><LogOut size={16} /></button>
          </div>

          {roster.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border">
              {roster.map((m) => (
                <div key={m.userId} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${speaker?.userId === m.userId ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                  <span className="flex-1 truncate">{m.name}{m.userId === myId ? " (tú)" : ""}</span>
                  {speaker?.userId === m.userId && <Mic size={13} className="text-amber-500" />}
                </div>
              ))}
            </div>
          )}
          {hint && <p className="text-[11px] text-red-600">{hint}</p>}
        </div>
      )}
    </div>
  );
}
