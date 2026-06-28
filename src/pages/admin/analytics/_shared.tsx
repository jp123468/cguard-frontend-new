import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, BarChart3 } from "lucide-react";
import { analyticsService, OpsAnalytics } from "@/lib/api/analyticsService";
import { PageContainer, PageHeader, SkeletonCards } from "@/components/kit";

/** Link a site name to its post-site detail page. */
export function SiteLink({ id, name }: { id?: string; name: string }) {
  if (!id) return <span className="font-medium text-foreground">{name}</span>;
  return <Link to={`/post-sites/${id}`} className="font-medium text-foreground hover:text-primary hover:underline">{name}</Link>;
}

/** Link a guard name to their performance/indicators page. */
export function GuardLink({ id, name }: { id?: string; name: string }) {
  if (!id) return <span className="font-medium text-foreground">{name}</span>;
  return <Link to={`/guards/${id}/indicadores`} className="font-medium text-foreground hover:text-primary hover:underline">{name}</Link>;
}

export const GOLD = "#C8860A";
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PRESETS: { label: string; days: number }[] = [
  { label: "Hoy", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

export function useOpsAnalytics(initialDays = 30) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState<OpsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    return { startDate: fmtDate(start), endDate: fmtDate(end) };
  }, [days]);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await analyticsService.operations(range)); }
    catch (e: any) { setError(e?.message || "No se pudieron cargar las analíticas"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);
  return { days, setDays, data, loading, error, reload: load };
}

/** Page chrome: CRM layout shell + header (title, range presets, refresh) + states. */
export function AnalyticsShell({
  title, subtitle, days, setDays, loading, error, reload, children,
}: {
  title: string; subtitle: string; days: number; setDays: (n: number) => void;
  loading: boolean; error: string | null; reload: () => void; children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <PageContainer width="wide" className="p-4 sm:p-6">
        <PageHeader
          icon={<BarChart3 />}
          title={title}
          subtitle={subtitle}
          actions={
            <>
              <div className="flex rounded-lg border border-border bg-card p-0.5">
                {PRESETS.map((p) => (
                  <button key={p.days} onClick={() => setDays(p.days)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${days === p.days ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <button onClick={reload} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/30" title="Actualizar">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            </>
          }
        />

        {loading ? (
          <SkeletonCards count={6} className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" />
        ) : error ? (
          <Card className="rounded-2xl border bg-card"><CardContent className="p-6 text-sm text-red-600">{error}</CardContent></Card>
        ) : (
          children
        )}
      </PageContainer>
    </AppLayout>
  );
}

export function MetricCard({ icon, value, label, sub, accent, pct }: {
  icon: React.ReactNode; value: string | number; label: string; sub?: string; accent: string; pct?: number;
}) {
  return (
    <Card className="h-full rounded-2xl border bg-card shadow-sm">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}1A`, color: accent }}>{icon}</span>
          {typeof pct === "number" && <span className="text-xs font-semibold" style={{ color: accent }}>{pct}%</span>}
        </div>
        <p className="mt-3 text-3xl font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground/80">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        {typeof pct === "number" && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: accent }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Daily bars from arbitrary points. */
export function DayBars({ title, points, color }: { title: string; points: { k: string; v: number }[]; color: string }) {
  const max = Math.max(1, ...points.map((p) => p.v));
  const total = points.reduce((s, p) => s + p.v, 0);
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{total}</span> total</p>
        </div>
        <div className="mt-3 flex h-24 items-end gap-[2px]">
          {points.map((p, i) => (
            <div key={i} title={`${p.k}: ${p.v}`} className="flex flex-1 items-end" style={{ height: "100%" }}>
              <div className="w-full rounded-t" style={{ height: `${(p.v / max) * 100}%`, minHeight: p.v > 0 ? 2 : 0, background: color }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{points[0]?.k.slice(5)}</span>
          <span>{points[points.length - 1]?.k.slice(5)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function HBars({ items, color, empty }: { items: { label: string; count: number }[]; color: string; empty: string }) {
  if (!items.length) return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate text-xs text-foreground/80" title={it.label}>{it.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted/40">
            <div className="h-full rounded" style={{ width: `${(it.count / max) * 100}%`, background: color }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{it.count}</span>
        </div>
      ))}
    </div>
  );
}

export function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">{icon}{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

/** Green/amber/rose by threshold. */
export const pctClass = (p: number) => (p >= 90 ? "text-emerald-600" : p >= 70 ? "text-amber-600" : "text-rose-600");

export function RangeFooter({ data }: { data: OpsAnalytics }) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Período: {data.range.start.slice(0, 10)} → {data.range.end.slice(0, 10)} · {data.range.days} días
    </p>
  );
}
