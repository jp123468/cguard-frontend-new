import { AlertTriangle, LogIn, Route, Siren, Activity as ActivityIcon, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ActivityItem } from "../types";
import { activityRoute } from "../navigation";
import { GlassCard, SectionHeader, statusColor } from "./primitives";

const ICON = {
  incident: AlertTriangle, checkin: LogIn, patrol: Route, alert: Siren, system: Radio, event: ActivityIcon,
} as const;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
  return `hace ${Math.floor(s / 86400)}d`;
}

export function ActivityFeed({ items, live }: { items: ActivityItem[]; live?: boolean }) {
  const navigate = useNavigate();
  return (
    <GlassCard scan className="flex flex-col" >
      <SectionHeader title="Actividad reciente" icon={<ActivityIcon size={16} />} live={live} />
      <div className="max-h-[360px] overflow-y-auto px-2 pb-3">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">Sin actividad reciente.</p>
        ) : items.map((it) => {
          const Icon = ICON[it.kind] || ActivityIcon;
          const c = statusColor(it.status);
          const to = activityRoute(it);
          return (
            <div
              key={it.id}
              role="button"
              tabIndex={0}
              aria-label={it.title}
              onClick={() => navigate(to)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(to); }
              }}
              className="cc-rise flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03] transition-colors"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c }}>
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{it.title}</p>
                {it.sub && <p className="truncate text-xs text-muted-foreground">{it.sub}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(it.at)}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
