import * as React from "react";
import {
  Loader2,
  VideoOff,
  WifiOff,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { videoService, type Camera, type StreamInfo } from "@/lib/api/videoService";

const GOLD = "#C8860A";

/* ------------------------------------------------------------------ */
/* hls.js dynamic loader (single shared <script> from CDN)             */
/* ------------------------------------------------------------------ */

// Pin an exact version with an SRI hash so a compromised/altered CDN build
// cannot execute arbitrary JS in the authenticated app context. The hash must
// be regenerated if HLS_CDN is bumped (openssl dgst -sha384 -binary | base64).
const HLS_CDN = "https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js";
const HLS_SRI = "sha384-R2JqybiEexSXz60H6Zz28MdsqWWnMQlP+NDb7nIhDHWxx6sM7Otw7OWCq9EBCPsz";
let hlsLoaderPromise: Promise<any> | null = null;

function loadHlsJs(): Promise<any> {
  // Already on window
  if (typeof window !== "undefined" && (window as any).Hls) {
    return Promise.resolve((window as any).Hls);
  }
  if (hlsLoaderPromise) return hlsLoaderPromise;

  hlsLoaderPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("no document"));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-hls-loader]"
    );
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).Hls));
      existing.addEventListener("error", () =>
        reject(new Error("hls.js failed to load"))
      );
      if ((window as any).Hls) resolve((window as any).Hls);
      return;
    }
    const script = document.createElement("script");
    script.src = HLS_CDN;
    script.async = true;
    script.integrity = HLS_SRI;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.dataset.hlsLoader = "true";
    script.onload = () => {
      if ((window as any).Hls) resolve((window as any).Hls);
      else reject(new Error("hls.js loaded but Hls global missing"));
    };
    script.onerror = () => {
      hlsLoaderPromise = null; // allow retry
      reject(new Error("hls.js failed to load"));
    };
    document.head.appendChild(script);
  });

  return hlsLoaderPromise;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type PlayerState =
  | "loading" // fetching stream info
  | "ready" // stream available, attempting/playing
  | "none" // no stream configured
  | "offline" // camera reported offline
  | "error"; // playback error

export type VideoPlayerProps = {
  camera: Camera;
  className?: string;
  /** auto attempt to play (muted) once stream is available; default true */
  autoPlay?: boolean;
  /** exposes the current <video> element (e.g. for snapshots) */
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  /** bubbles up resolved stream info so the page can wire snapshots */
  onStream?: (info: StreamInfo | null) => void;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function VideoPlayer({
  camera,
  className,
  autoPlay = true,
  videoRef,
  onStream,
}: VideoPlayerProps) {
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = React.useRef<any>(null);

  const [state, setState] = React.useState<PlayerState>("loading");
  const [stream, setStream] = React.useState<StreamInfo | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const setVideoEl = React.useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el;
      if (videoRef) videoRef.current = el;
    },
    [videoRef]
  );

  const cameraOffline = camera.status === "offline";

  // Fetch stream info whenever the camera (or a manual reload) changes.
  React.useEffect(() => {
    let cancelled = false;

    if (cameraOffline) {
      setState("offline");
      setStream(null);
      onStream?.(null);
      return;
    }

    setState("loading");
    setErrorMsg(null);

    videoService
      .stream(camera.id)
      .then((info) => {
        if (cancelled) return;
        setStream(info);
        onStream?.(info);
        if (!info || info.type === "none" || !info.url) {
          setState("none");
        } else {
          setState("ready");
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        // Fall back to anything we already know on the camera record.
        if (camera.streamUrl) {
          const fallback: StreamInfo = {
            type: "hls",
            url: camera.streamUrl,
            snapshotUrl: camera.snapshotUrl || undefined,
          };
          setStream(fallback);
          onStream?.(fallback);
          setState("ready");
          return;
        }
        setStream(null);
        onStream?.(null);
        setErrorMsg(e?.data?.message || e?.message || "No se pudo obtener la transmisión");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.id, camera.status, reloadKey]);

  // Attach the stream to the <video> element when ready.
  React.useEffect(() => {
    const video = localVideoRef.current;
    if (state !== "ready" || !stream?.url || !video) return;

    let cancelled = false;
    const url = stream.url;

    // Clean up any previous hls.js instance before re-attaching.
    const destroyHls = () => {
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsInstanceRef.current = null;
      }
    };

    destroyHls();

    const onPlaybackError = (msg: string) => {
      if (cancelled) return;
      setErrorMsg(msg);
      setState("error");
    };

    // WebRTC streams are not handled by hls.js — if a gateway later serves a
    // direct playable URL we still try to set it; otherwise surface a notice.
    if (stream.type === "webrtc") {
      // Best effort: some gateways expose a WHEP/HLS-compatible URL. We attempt
      // to let the browser play it natively; if it can't, show an error state.
      video.src = url;
      if (autoPlay) video.play().catch(() => {});
      return () => {
        cancelled = true;
      };
    }

    const canNativeHls =
      video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (canNativeHls) {
      // Safari / iOS — native HLS.
      video.src = url;
      const onErr = () => onPlaybackError("Error de reproducción");
      video.addEventListener("error", onErr);
      if (autoPlay) video.play().catch(() => {});
      return () => {
        cancelled = true;
        video.removeEventListener("error", onErr);
        video.removeAttribute("src");
        video.load();
      };
    }

    // Everyone else — load hls.js from CDN.
    loadHlsJs()
      .then((Hls) => {
        if (cancelled || localVideoRef.current !== video) return;
        if (!Hls.isSupported()) {
          onPlaybackError("Tu navegador no soporta HLS");
          return;
        }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsInstanceRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (!data?.fatal) return;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              try {
                hls.startLoad();
              } catch {
                onPlaybackError("Error de red en la transmisión");
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              try {
                hls.recoverMediaError();
              } catch {
                onPlaybackError("Error de medios en la transmisión");
              }
              break;
            default:
              onPlaybackError("No se pudo reproducir la transmisión");
              break;
          }
        });
      })
      .catch(() => {
        onPlaybackError("No se pudo cargar el reproductor de video");
      });

    return () => {
      cancelled = true;
      destroyHls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stream?.url, stream?.type, autoPlay]);

  // Destroy hls.js on unmount.
  React.useEffect(() => {
    return () => {
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsInstanceRef.current = null;
      }
    };
  }, []);

  const reload = () => setReloadKey((k) => k + 1);

  const snapshot = stream?.snapshotUrl || camera.snapshotUrl || undefined;

  /* ----------------------------- render ----------------------------- */

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg bg-black",
        className
      )}
    >
      {/* Live video — only mounted while ready */}
      {state === "ready" ? (
        <video
          ref={setVideoEl}
          className="h-full w-full bg-black object-contain"
          playsInline
          muted
          autoPlay={autoPlay}
          controls
          poster={snapshot}
        />
      ) : null}

      {state === "loading" ? (
        <Overlay>
          <Loader2 className="size-7 animate-spin" style={{ color: GOLD }} />
          <p className="text-sm text-white/70">Conectando…</p>
        </Overlay>
      ) : null}

      {state === "offline" ? (
        <Overlay snapshot={snapshot}>
          <WifiOff className="size-8 text-white/60" />
          <p className="text-sm font-medium text-white/80">Cámara fuera de línea</p>
          <RetryButton onClick={reload} />
        </Overlay>
      ) : null}

      {state === "none" ? (
        <Overlay snapshot={snapshot}>
          <VideoOff className="size-8" style={{ color: GOLD }} />
          <p className="text-sm font-medium text-white/85">
            Sin transmisión configurada
          </p>
          <p className="max-w-[80%] text-center text-xs text-white/55">
            Configura el gateway de video para ver esta cámara en vivo.
          </p>
        </Overlay>
      ) : null}

      {state === "error" ? (
        <Overlay snapshot={snapshot}>
          <AlertTriangle className="size-8 text-amber-400" />
          <p className="text-sm font-medium text-white/85">
            {errorMsg || "Error de transmisión"}
          </p>
          <RetryButton onClick={reload} />
        </Overlay>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Internal bits                                                       */
/* ------------------------------------------------------------------ */

function Overlay({
  children,
  snapshot,
}: {
  children: React.ReactNode;
  snapshot?: string;
}) {
  return (
    <div className="absolute inset-0">
      {snapshot ? (
        <>
          <img
            src={snapshot}
            alt="Vista previa de la cámara"
            className="h-full w-full object-cover opacity-40"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </>
      ) : null}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
        {children}
      </div>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20"
    >
      <RefreshCw className="size-3.5" />
      Reintentar
    </button>
  );
}

export default VideoPlayer;

// Re-export for callers that want the inline play badge style.
export { PlayCircle };
