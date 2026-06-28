import { RefreshCw, SlidersHorizontal, Wifi, WifiOff, Sparkles } from "lucide-react";

export type RangeKey = "today" | "7d" | "30d" | "12m";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hoy" }, { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" }, { key: "12m", label: "12 meses" },
];

export function Toolbar({
  range, onRange, onRefresh, onCustomize, sseConnected, lastSync, demo, onDemo,
}: {
  range: RangeKey; onRange: (r: RangeKey) => void; onRefresh: () => void;
  onCustomize: () => void; sseConnected: boolean; lastSync: string;
  demo: boolean; onDemo: (v: boolean) => void;
}) {
  return (
    <div className="cc-glass mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <h1 className="font-display text-lg font-bold tracking-tight text-foreground">Panel de control</h1>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {demo ? (
            <><Sparkles size={12} className="text-[color:var(--cc-accent)]" />Datos de demostración</>
          ) : (
            <>
              {sseConnected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-amber-400" />}
              {sseConnected ? "Tiempo real conectado" : "Sondeo activo"}
              {lastSync && <span className="opacity-60">· sinc. {new Date(lastSync).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Demo data switch — lets a new tenant preview a populated dashboard. */}
        <button
          type="button"
          role="switch"
          aria-checked={demo}
          onClick={() => onDemo(!demo)}
          title="Mostrar datos de demostración"
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition active:scale-95"
        >
          <Sparkles size={14} className={demo ? "text-[color:var(--cc-accent)]" : ""} />
          <span className={demo ? "text-[color:var(--cc-accent)]" : ""}>Demo</span>
          <span
            className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
            style={{ background: demo ? "var(--cc-accent)" : "color-mix(in oklab, var(--foreground) 22%, transparent)" }}
          >
            <span
              className="absolute h-3 w-3 rounded-full bg-white transition-transform"
              style={{ transform: demo ? "translateX(14px)" : "translateX(2px)" }}
            />
          </span>
        </button>
        <div className="flex rounded-lg border border-border/60 bg-white/[0.03] p-0.5">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => onRange(r.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r.key ? "text-[color:var(--cc-accent)]" : "text-muted-foreground hover:text-foreground"}`}
              style={range === r.key ? { background: "color-mix(in oklab, var(--cc-accent) 16%, transparent)" } : undefined}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} title="Actualizar"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition">
          <RefreshCw size={15} />
        </button>
        <button onClick={onCustomize}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition active:scale-95"
          style={{ borderColor: "color-mix(in oklab, var(--cc-accent) 40%, transparent)", color: "var(--cc-accent)" }}>
          <SlidersHorizontal size={14} /> Personalizar
        </button>
      </div>
    </div>
  );
}
