import * as React from "react";
import { toast } from "sonner";
import {
  Video,
  Loader2,
  Camera as CameraIcon,
  Scissors,
  AlertTriangle,
  Radio,
  ImageDown,
  RefreshCw,
  MonitorPlay,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/components/kit";
import { cn } from "@/lib/utils";
import {
  videoService,
  type Camera,
  type Device,
  type StreamInfo,
} from "@/lib/api/videoService";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import {
  TrimShareModal,
  CreateIncidentModal,
  DispatchModal,
} from "@/components/video/VideoActionModals";


type ModalKind = "trim" | "incident" | "dispatch" | null;

/* ------------------------------------------------------------------ */
/* Status dot                                                          */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status?: string }) {
  const color =
    status === "online"
      ? "bg-emerald-500"
      : status === "offline"
      ? "bg-red-500"
      : "bg-zinc-400";
  const label =
    status === "online"
      ? "En línea"
      : status === "offline"
      ? "Fuera de línea"
      : "Desconocido";
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span className={cn("size-2 rounded-full", color)}>
        {status === "online" ? (
          <span className="absolute size-2 animate-ping rounded-full bg-emerald-500/70" />
        ) : null}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Camera tile                                                         */
/* ------------------------------------------------------------------ */

function TileButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[--gold] hover:text-foreground"
      style={{ ["--gold" as any]: "var(--primary)" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function CameraTile({
  camera,
  deviceName,
  onAction,
}: {
  camera: Camera;
  deviceName?: string;
  onAction: (kind: Exclude<ModalKind, null>, camera: Camera) => void;
}) {
  const videoElRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<StreamInfo | null>(null);

  const handleSnapshot = async () => {
    const video = videoElRef.current;
    // 1) Try to grab a frame from the live <video> element via canvas.
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          downloadDataUrl(dataUrl, `snapshot-${slug(camera.name)}.jpg`);
          toast.success("Captura descargada");
          return;
        }
      } catch {
        // CORS-tainted canvas etc. — fall through to snapshot URL.
      }
    }
    // 2) Fall back to the configured snapshot URL.
    const snap = streamRef.current?.snapshotUrl || camera.snapshotUrl;
    if (snap && /^https?:\/\//i.test(snap)) {
      window.open(snap, "_blank", "noopener,noreferrer");
      toast.success("Captura abierta en una pestaña");
      return;
    }
    toast.error("No hay captura disponible para esta cámara");
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <VideoPlayer
        camera={camera}
        videoRef={videoElRef}
        onStream={(info) => {
          streamRef.current = info;
        }}
      />

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusDot status={camera.status} />
              <h3 className="truncate text-sm font-semibold">
                {camera.name || `Cámara ${camera.channel ?? ""}`}
              </h3>
            </div>
            {deviceName ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {deviceName}
                {camera.channel ? ` · Canal ${camera.channel}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <TileButton
            icon={<Scissors className="size-3.5" />}
            label="Recortar"
            onClick={() => onAction("trim", camera)}
          />
          <TileButton
            icon={<AlertTriangle className="size-3.5" />}
            label="Incidente"
            onClick={() => onAction("incident", camera)}
          />
          <TileButton
            icon={<Radio className="size-3.5" />}
            label="Despachar"
            onClick={() => onAction("dispatch", camera)}
          />
          <TileButton
            icon={<ImageDown className="size-3.5" />}
            label="Captura"
            onClick={handleSnapshot}
          />
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slug(name?: string | null): string {
  return (name || "camara")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const selectClass =
  "flex h-9 w-full sm:w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function VideoMonitoring() {
  const [cameras, setCameras] = React.useState<Camera[]>([]);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [deviceFilter, setDeviceFilter] = React.useState<string>("");
  const [siteFilter, setSiteFilter] = React.useState<string>("");

  const [modal, setModal] = React.useState<ModalKind>(null);
  const [activeCamera, setActiveCamera] = React.useState<Camera | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cams, devs] = await Promise.all([
        videoService.cameras(),
        videoService.devices().catch(() => [] as Device[]),
      ]);
      setCameras(Array.isArray(cams) ? cams : []);
      setDevices(Array.isArray(devs) ? devs : []);
    } catch (e) {
      const err = e as { data?: { message?: string }; message?: string };
      setError(
        err?.data?.message || err?.message || "No se pudieron cargar las cámaras"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const deviceName = React.useCallback(
    (id?: string | null) => {
      if (!id) return undefined;
      const d = devices.find((x) => x.id === id);
      return d?.name;
    },
    [devices]
  );

  // Distinct post-site ids present among cameras (for the site filter).
  const siteOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of cameras) if (c.postSiteId) set.add(c.postSiteId);
    return Array.from(set);
  }, [cameras]);

  const visible = React.useMemo(() => {
    return cameras
      .filter((c) => c.enabled !== false)
      .filter((c) => (deviceFilter ? c.videoDeviceId === deviceFilter : true))
      .filter((c) => (siteFilter ? c.postSiteId === siteFilter : true));
  }, [cameras, deviceFilter, siteFilter]);

  const openAction = (kind: Exclude<ModalKind, null>, camera: Camera) => {
    setActiveCamera(camera);
    setModal(kind);
  };
  const closeModal = () => setModal(null);

  return (
    <AppLayout>
      <PageContainer width="wide" className="max-w-[1600px]">
        {/* Header */}
        <PageHeader
          icon={<MonitorPlay />}
          title="Monitoreo de video"
          subtitle="Vigilancia en vivo de todas las cámaras conectadas."
          actions={
          /* Filters */
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className={selectClass}
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              aria-label="Filtrar por dispositivo"
            >
              <option value="">Todos los dispositivos</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {siteOptions.length > 0 ? (
              <select
                className={selectClass}
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                aria-label="Filtrar por sitio"
              >
                <option value="">Todos los sitios</option>
                {siteOptions.map((s) => (
                  <option key={s} value={s}>
                    Sitio {s.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : null}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw
                className={cn("size-4", loading && "animate-spin")}
              />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
          }
        />

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-sm">Cargando cámaras…</p>
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertTriangle />}
            title="No se pudieron cargar las cámaras"
            description={error}
            action={
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <RefreshCw className="size-4" />
                Reintentar
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<CameraIcon />}
            title={
              cameras.length === 0
                ? "Aún no hay cámaras configuradas"
                : "Ninguna cámara coincide con los filtros"
            }
            description={
              cameras.length === 0
                ? "Agrega un dispositivo y sincroniza sus cámaras para comenzar."
                : "Ajusta los filtros para ver más cámaras."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((camera) => (
              <CameraTile
                key={camera.id}
                camera={camera}
                deviceName={deviceName(camera.videoDeviceId)}
                onAction={openAction}
              />
            ))}
          </div>
        )}

        {/* Footer count */}
        {!loading && !error && visible.length > 0 ? (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Video className="size-3.5" />
            {visible.length} cámara{visible.length === 1 ? "" : "s"} en vista
          </p>
        ) : null}
      </PageContainer>

      {/* Action modals */}
      <TrimShareModal
        camera={activeCamera}
        open={modal === "trim"}
        onClose={closeModal}
      />
      <CreateIncidentModal
        camera={activeCamera}
        open={modal === "incident"}
        onClose={closeModal}
      />
      <DispatchModal
        camera={activeCamera}
        open={modal === "dispatch"}
        onClose={closeModal}
      />
    </AppLayout>
  );
}
