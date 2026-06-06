import { useEffect, useMemo, useState } from "react";
import { Maximize, X, Radio } from "lucide-react";
import { useControlCenter } from "./useControlCenter";
import { useDemoData } from "./demoData";
import { loadPrefs } from "./prefs";
import { OperationsMap } from "./components/OperationsMap";
import "./control-center.css";

/**
 * Full-screen "Operaciones en tiempo real" — opened in its own tab from the
 * dashboard. Reuses the same live data hook (and demo mode) as the panel, and
 * renders the operations map filling the whole viewport.
 */
export default function OperationsMapFull() {
  const prefs = useMemo(() => loadPrefs(), []);
  const demo = useMemo(() => {
    try { return localStorage.getItem("cc_demo") === "1"; } catch { return false; }
  }, []);

  const live = useControlCenter(prefs.liveTracking ? prefs.locationIntervalSec : 3600);
  const demoData = useDemoData(demo);
  const data = demo ? demoData : live;

  const [h, setH] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800));
  useEffect(() => {
    document.title = "Operaciones en tiempo real · CGuardPro";
    const onResize = () => setH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const legend = [
    { k: "tenant", label: "Sede" },
    { k: "station", label: "Puestos" },
    { k: "guard", label: "Guardias" },
    { k: "supervisor", label: "Supervisores" },
  ] as const;

  const goFullscreen = () => {
    try {
      const el: any = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen?.();
      else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="cc-root relative"
      style={{ ["--cc-accent" as any]: prefs.accent, height: "100vh", width: "100vw", overflow: "hidden" }}
    >
      {/* overlay header */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ background: "linear-gradient(to bottom, rgba(8,12,20,0.82), rgba(8,12,20,0))" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Radio size={15} className="text-emerald-400" />
            Operaciones en tiempo real
            {demo && <span className="rounded-full bg-[color:var(--cc-accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[color:var(--cc-accent)]">DEMO</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {legend.map((l) => (
              <span key={l.k} className="flex items-center gap-1 text-[11px] text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ background: prefs.pinColors[l.k as keyof typeof prefs.pinColors] }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goFullscreen}
            title="Pantalla completa"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/40 text-white/80 hover:text-white active:scale-95 transition"
          >
            <Maximize size={15} />
          </button>
          <button
            onClick={() => window.close()}
            title="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/40 text-white/80 hover:text-white active:scale-95 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <OperationsMap entities={data.entities} prefs={prefs} height={h} />
    </div>
  );
}
