import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Copy, Server } from "lucide-react";
import { toast } from "sonner";
import { videoService, type Device } from "@/lib/api/videoService";

/**
 * Configure the media gateway (go2rtc) for a device so its cameras play live in
 * the browser. Browsers can't play RTSP; go2rtc converts RTSP -> WebRTC/HLS.
 */
export default function VideoGatewayModal({
  device, open, onClose, onSaved,
}: { device: Device | null; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [base, setBase] = useState("");
  const [format, setFormat] = useState<"hls" | "webrtc">("hls");
  const [saving, setSaving] = useState(false);
  const [yaml, setYaml] = useState("");
  const [loadingYaml, setLoadingYaml] = useState(false);

  useEffect(() => {
    if (open && device) {
      setBase(device.streamGatewayBase || "");
      setFormat((device.streamFormat as any) || "hls");
      setYaml("");
      setLoadingYaml(true);
      videoService.gatewayConfig(device.id).then((r) => setYaml(r.yaml || "")).catch(() => setYaml("")).finally(() => setLoadingYaml(false));
    }
  }, [open, device]);

  if (!open || !device) return null;

  const save = async () => {
    setSaving(true);
    try {
      const r: any = await videoService.setGateway(device.id, { streamGatewayBase: base.trim(), streamFormat: format });
      toast.success(base.trim() ? `Gateway configurado · ${r?.camerasUpdated ?? 0} cámaras` : "Gateway desconectado");
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar el gateway");
    } finally {
      setSaving(false);
    }
  };

  const copyYaml = async () => {
    try { await navigator.clipboard.writeText(yaml); toast.success("Configuración go2rtc copiada"); } catch { /* ignore */ }
  };

  const inputCls = "w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm outline-none focus:border-[#C8860A] focus:ring-2 focus:ring-[#C8860A]/20";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border/30 bg-card shadow-2xl max-h-[92vh] sm:max-h-[88vh] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8860A]/12 text-[#C8860A]"><Server size={18} /></div>
            <div>
              <h4 className="text-base font-semibold text-foreground">Gateway de video</h4>
              <p className="text-xs text-muted-foreground">{device.name} · convierte RTSP → WebRTC/HLS para el navegador</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30"><X size={16} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">URL base del gateway (go2rtc)</label>
            <input className={inputCls} value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://gateway.tu-dominio.com  (o http://IP-del-bridge:1984)" />
            <p className="mt-1 text-[11px] text-muted-foreground">Donde corre go2rtc — en la nube (si el DVR es accesible por DDNS) o un bridge en sitio.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Formato</label>
            <div className="flex gap-2">
              {(["hls", "webrtc"] as const).map((f) => (
                <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${format === f ? "border-[#C8860A] bg-[#C8860A]/10 text-[#C8860A]" : "border-border/40 text-muted-foreground"}`}>
                  {f === "hls" ? "HLS (compatible)" : "WebRTC (baja latencia)"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-muted/10 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Configuración go2rtc (pégala en go2rtc.yaml)</p>
              <button onClick={copyYaml} disabled={!yaml} className="inline-flex items-center gap-1 text-xs font-medium text-[#C8860A] hover:underline disabled:opacity-40"><Copy size={12} /> Copiar</button>
            </div>
            {loadingYaml ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Generando…</div>
            ) : (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-2 text-[11px] text-foreground/90">{yaml || "Sincroniza las cámaras del dispositivo primero."}</pre>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground">Despliega go2rtc con este config; toma el RTSP del DVR y lo sirve al CRM.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/20 px-5 py-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20">Cancelar</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
