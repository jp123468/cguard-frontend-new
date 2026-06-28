import * as React from "react";
import {
  Loader2, VideoOff, WifiOff, PlayCircle, AlertTriangle, RefreshCw,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus, Move,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { videoService, type Camera, type StreamInfo } from "@/lib/api/videoService";

const GOLD = "#C8860A";

/* ------------------------------------------------------------------ */
/* go2rtc player engine (WebRTC → MSE → HLS → MJPEG) — loaded once     */
/* from our own gateway as an ES module that defines <video-stream>.   */
/* ------------------------------------------------------------------ */
let go2rtcLoader: Promise<void> | null = null;
function loadGo2rtcPlayer(gateway: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (customElements.get("video-stream")) return Promise.resolve();
  if (go2rtcLoader) return go2rtcLoader;
  go2rtcLoader = new Promise<void>((resolve, reject) => {
    const done = () => customElements.whenDefined("video-stream").then(() => resolve());
    const existing = document.querySelector<HTMLScriptElement>("script[data-go2rtc-player]");
    if (existing) { existing.addEventListener("load", done); existing.addEventListener("error", () => reject(new Error("load failed"))); if (customElements.get("video-stream")) resolve(); return; }
    const s = document.createElement("script");
    s.type = "module";
    s.src = `${gateway.replace(/\/+$/, "")}/video-stream.js`;
    s.dataset.go2rtcPlayer = "true";
    s.onload = done;
    s.onerror = () => { go2rtcLoader = null; reject(new Error("go2rtc player failed to load")); };
    document.head.appendChild(s);
  });
  return go2rtcLoader;
}

/* ------------------------------------------------------------------ */
/* hls.js (fallback for non-go2rtc / manual streamUrl)                 */
/* ------------------------------------------------------------------ */
const HLS_CDN = "https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js";
const HLS_SRI = "sha384-R2JqybiEexSXz60H6Zz28MdsqWWnMQlP+NDb7nIhDHWxx6sM7Otw7OWCq9EBCPsz";
let hlsLoaderPromise: Promise<any> | null = null;
function loadHlsJs(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).Hls) return Promise.resolve((window as any).Hls);
  if (hlsLoaderPromise) return hlsLoaderPromise;
  hlsLoaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = HLS_CDN; s.async = true; s.integrity = HLS_SRI; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
    s.onload = () => ((window as any).Hls ? resolve((window as any).Hls) : reject(new Error("Hls missing")));
    s.onerror = () => { hlsLoaderPromise = null; reject(new Error("hls.js failed")); };
    document.head.appendChild(s);
  });
  return hlsLoaderPromise;
}

type PlayerState = "loading" | "ready" | "none" | "offline" | "error";

export type VideoPlayerProps = {
  camera: Camera;
  className?: string;
  autoPlay?: boolean;
  /** show the PTZ joystick overlay (default true). */
  ptz?: boolean;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  onStream?: (info: StreamInfo | null) => void;
};

export function VideoPlayer({ camera, className, autoPlay = true, ptz = true, videoRef, onStream }: VideoPlayerProps) {
  const videoElRef = React.useRef<HTMLVideoElement | null>(null);
  const streamElRef = React.useRef<any>(null);
  const hlsRef = React.useRef<any>(null);

  const [state, setState] = React.useState<PlayerState>("loading");
  const [stream, setStream] = React.useState<StreamInfo | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const setVideoEl = React.useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (videoRef) videoRef.current = el;
  }, [videoRef]);

  const cameraOffline = camera.status === "offline";

  // 1) Resolve stream info.
  React.useEffect(() => {
    let cancelled = false;
    if (cameraOffline) { setState("offline"); setStream(null); onStream?.(null); return; }
    setState("loading"); setErrorMsg(null);
    videoService.stream(camera.id)
      .then((info) => {
        if (cancelled) return;
        setStream(info); onStream?.(info);
        setState(!info || info.type === "none" || (!info.ws && !info.url) ? "none" : "ready");
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (camera.streamUrl) {
          const fb: StreamInfo = { type: "hls", url: camera.streamUrl, snapshotUrl: camera.snapshotUrl || undefined };
          setStream(fb); onStream?.(fb); setState("ready"); return;
        }
        setStream(null); onStream?.(null);
        setErrorMsg(e?.data?.message || e?.message || "No se pudo obtener la transmisión"); setState("error");
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.id, camera.status, reloadKey]);

  // 2) Attach the player when ready.
  React.useEffect(() => {
    if (state !== "ready" || !stream) return;
    let cancelled = false;
    const onErr = (m: string) => { if (!cancelled) { setErrorMsg(m); setState("error"); } };

    // ---- go2rtc engine (MSE over WS through the proxy) ----
    if (stream.type === "go2rtc" && stream.ws) {
      loadGo2rtcPlayer(stream.gateway || "")
        .then(() => {
          if (cancelled) return;
          const el = streamElRef.current;
          if (!el) return;
          // Order matters: set transports BEFORE src (src triggers the connection).
          el.background = true;              // keep streaming even when off-screen
          el.mode = stream.mode || "mse,mp4";
          if (el.src !== stream.ws) el.src = stream.ws;
        })
        .catch(() => onErr("No se pudo cargar el reproductor de video"));
      // Do NOT clear el.src here — React unmounting <video-stream> runs the component's
      // own disconnectedCallback. Clearing on every re-render tore the pipeline down
      // mid-connect and left the <video> with an empty src.
      return () => { cancelled = true; };
    }

    // ---- HLS fallback (manual streamUrl / no gateway) ----
    const url = stream.url;
    const video = videoElRef.current;
    if (!url || !video) return;
    const destroyHls = () => { if (hlsRef.current) { try { hlsRef.current.destroy(); } catch { /* */ } hlsRef.current = null; } };
    destroyHls();
    if (video.canPlayType("application/vnd.apple.mpegurl") !== "") {
      video.src = url; if (autoPlay) video.play().catch(() => {});
      return () => { cancelled = true; video.removeAttribute("src"); video.load(); };
    }
    loadHlsJs().then((Hls) => {
      if (cancelled || videoElRef.current !== video) return;
      if (!Hls.isSupported()) return onErr("Tu navegador no soporta HLS");
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls; hls.loadSource(url); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (autoPlay) video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e: any, d: any) => {
        if (!d?.fatal) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) { try { hls.startLoad(); } catch { onErr("Error de red"); } }
        else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) { try { hls.recoverMediaError(); } catch { onErr("Error de medios"); } }
        else onErr("No se pudo reproducir la transmisión");
      });
    }).catch(() => onErr("No se pudo cargar el reproductor de video"));
    return () => { cancelled = true; destroyHls(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stream?.type, stream?.ws, stream?.url, autoPlay]);

  React.useEffect(() => () => { if (hlsRef.current) { try { hlsRef.current.destroy(); } catch { /* */ } } }, []);

  const reload = () => setReloadKey((k) => k + 1);
  const snapshot = stream?.snapshotUrl || camera.snapshotUrl || undefined;
  const isGo2rtc = stream?.type === "go2rtc" && !!stream.ws;

  return (
    <div className={cn("group relative aspect-video w-full overflow-hidden rounded-lg bg-black", className)}>
      {state === "ready" ? (
        isGo2rtc ? (
          React.createElement("video-stream", { ref: streamElRef, class: "h-full w-full", style: { width: "100%", height: "100%" } })
        ) : (
          <video ref={setVideoEl} className="h-full w-full bg-black object-contain" playsInline muted autoPlay={autoPlay} controls poster={snapshot} />
        )
      ) : null}

      {state === "ready" && ptz ? <PtzPad cameraId={camera.id} /> : null}

      {state === "loading" ? (
        <Overlay><Loader2 className="size-7 animate-spin" style={{ color: GOLD }} /><p className="text-sm text-white/70">Conectando…</p></Overlay>
      ) : null}
      {state === "offline" ? (
        <Overlay snapshot={snapshot}><WifiOff className="size-8 text-white/60" /><p className="text-sm font-medium text-white/80">Cámara fuera de línea</p><RetryButton onClick={reload} /></Overlay>
      ) : null}
      {state === "none" ? (
        <Overlay snapshot={snapshot}><VideoOff className="size-8" style={{ color: GOLD }} /><p className="text-sm font-medium text-white/85">Sin transmisión configurada</p></Overlay>
      ) : null}
      {state === "error" ? (
        <Overlay snapshot={snapshot}><AlertTriangle className="size-8 text-amber-400" /><p className="text-sm font-medium text-white/85">{errorMsg || "Error de transmisión"}</p><RetryButton onClick={reload} /></Overlay>
      ) : null}
    </div>
  );
}

/* ----------------------------- PTZ joystick ----------------------------- */
function PtzPad({ cameraId }: { cameraId: string }) {
  const [open, setOpen] = React.useState(false);
  const moving = React.useRef(false);
  const start = (v: { pan?: number; tilt?: number; zoom?: number }) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation(); moving.current = true;
    videoService.ptz(cameraId, v).catch(() => {});
  };
  const stop = () => { if (!moving.current) return; moving.current = false; videoService.ptz(cameraId, { stop: true }).catch(() => {}); };
  const S = 0.7;
  const dirBtn = (icon: React.ReactNode, v: any, cls: string) => (
    <button onPointerDown={start(v)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      className={cn("grid place-items-center rounded-md bg-black/55 text-white/90 backdrop-blur transition-colors hover:bg-[#C8860A] active:bg-[#C8860A]", cls)}>{icon}</button>
  );

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Control PTZ"
        className="absolute bottom-2 right-2 z-20 grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white/85 opacity-0 backdrop-blur transition-opacity hover:bg-black/75 group-hover:opacity-100">
        <Move size={15} />
      </button>
    );
  }
  return (
    <div className="absolute bottom-2 right-2 z-20 flex items-end gap-2" onPointerLeave={stop}>
      {/* zoom */}
      <div className="flex flex-col gap-1">
        {dirBtn(<Plus size={14} />, { zoom: S }, "h-7 w-7")}
        {dirBtn(<Minus size={14} />, { zoom: -S }, "h-7 w-7")}
      </div>
      {/* d-pad */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <span />{dirBtn(<ChevronUp size={16} />, { tilt: S }, "h-7 w-7")}<span />
        {dirBtn(<ChevronLeft size={16} />, { pan: -S }, "h-7 w-7")}
        <button onClick={() => setOpen(false)} title="Cerrar" className="grid h-7 w-7 place-items-center rounded-md bg-black/40 text-white/50 hover:text-white"><Move size={13} /></button>
        {dirBtn(<ChevronRight size={16} />, { pan: S }, "h-7 w-7")}
        <span />{dirBtn(<ChevronDown size={16} />, { tilt: -S }, "h-7 w-7")}<span />
      </div>
    </div>
  );
}

/* ----------------------------- internals ----------------------------- */
function Overlay({ children, snapshot }: { children: React.ReactNode; snapshot?: string }) {
  return (
    <div className="absolute inset-0">
      {snapshot ? (<><img src={snapshot} alt="" className="h-full w-full object-cover opacity-40" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} /><div className="absolute inset-0 bg-black/40" /></>) : null}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">{children}</div>
    </div>
  );
}
function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20">
      <RefreshCw className="size-3.5" /> Reintentar
    </button>
  );
}

export default VideoPlayer;
export { PlayCircle };
