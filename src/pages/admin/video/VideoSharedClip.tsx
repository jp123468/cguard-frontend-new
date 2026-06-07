import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ShieldAlert, Film } from "lucide-react";
import { ApiService } from "@/services/api/apiService";

interface SharedClip {
  label?: string;
  url?: string;
  thumbnailUrl?: string;
  startAt?: string;
  endAt?: string;
}

/**
 * Public, no-login viewer for a tokened clip share link sent to a customer.
 * Backend: GET /api/video/clip/shared/:token (allow-listed in authMiddleware).
 */
export default function VideoSharedClip() {
  const { token } = useParams();
  const [clip, setClip] = useState<SharedClip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const res: any = await ApiService.get(`/video/clip/shared/${encodeURIComponent(String(token))}`, { skipAuth: true } as any);
        if (on) setClip(res?.data ?? res);
      } catch {
        if (on) setError("Este enlace no es válido o ya expiró.");
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [token]);

  const fmt = (v?: string) => { try { return v ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : ""; } catch { return v || ""; } };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1220] p-4 text-slate-100">
      <div className="w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C8860A]/40 bg-[#111a2e] text-[#C8860A]"><Film size={18} /></div>
          <div>
            <p className="text-sm font-bold tracking-tight">CGUARD<span className="text-[#C8860A]">PRO</span></p>
            <p className="text-[11px] text-slate-400">Video compartido de forma segura</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          {loading ? (
            <div className="flex h-72 items-center justify-center"><Loader2 className="animate-spin text-[#C8860A]" /></div>
          ) : error ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2 text-center text-slate-300">
              <ShieldAlert className="text-rose-400" size={28} />
              <p className="text-sm">{error}</p>
            </div>
          ) : clip?.url ? (
            <video src={clip.url} poster={clip.thumbnailUrl} controls autoPlay className="h-auto w-full bg-black" />
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">El video aún se está procesando. Intenta de nuevo en unos minutos.</div>
          )}
        </div>

        {clip && !error && (
          <div className="mt-3">
            <p className="text-base font-semibold">{clip.label || "Clip de video"}</p>
            {(clip.startAt || clip.endAt) && (
              <p className="text-xs text-slate-400">{fmt(clip.startAt)}{clip.endAt ? ` — ${fmt(clip.endAt)}` : ""}</p>
            )}
          </div>
        )}
        <p className="mt-6 text-center text-[11px] text-slate-500">Este enlace es privado y puede expirar. No lo compartas.</p>
      </div>
    </div>
  );
}
