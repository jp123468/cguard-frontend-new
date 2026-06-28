import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, LogIn, LogOut, UserCheck, Route, CalendarClock, CalendarDays,
  CheckSquare, Megaphone, Siren, Activity as ActivityIcon, Search, CheckCheck,
  RefreshCw, Inbox, Radio, Loader2,
} from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, StatusBadge } from "@/components/kit";
import api from "@/lib/api";
import { fileUrlFromPrivate } from "@/lib/fileUrl";
import { useNotificationStream } from "@/hooks/useNotificationStream";

/* ─────────────────────────────────────────────────────────────────────────
   The activity log is powered by the platform Events API:
     GET  /:tenantId/events            → recent history (last 7 days, ≤50)
     GET  /:tenantId/events/stream     → live SSE feed (via useNotificationStream)
     POST /:tenantId/events/:id/read   → mark read
   Events already arrive with localized `title`/`body` from the backend
   notification templates, so we only translate the page chrome here.
   ───────────────────────────────────────────────────────────────────────── */

type Category = "incident" | "checkin" | "visitor" | "patrol" | "shift" | "other";

interface ActivityEvent {
  id: string;
  eventType: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  payload?: any;
}

/** Map a backend eventType (e.g. "guard.checkin") to an icon + accent + filter category. */
function visualFor(eventType: string): { Icon: typeof ActivityIcon; color: string; cat: Category } {
  const t = (eventType || "").toLowerCase();
  if (t.startsWith("incident")) return { Icon: AlertTriangle, color: "#ef4444", cat: "incident" };
  if (t === "guard.late") return { Icon: AlertTriangle, color: "#f59e0b", cat: "incident" };
  if (t === "guard.checkin") return { Icon: LogIn, color: "#22c55e", cat: "checkin" };
  if (t === "guard.checkout") return { Icon: LogOut, color: "#64748b", cat: "checkin" };
  if (t.startsWith("visitor")) return { Icon: UserCheck, color: "#38bdf8", cat: "visitor" };
  if (t.startsWith("patrol")) return { Icon: Route, color: t.includes("missed") ? "#f59e0b" : "#a855f7", cat: "patrol" };
  if (t.startsWith("shift")) return { Icon: CalendarClock, color: "#0ea5e9", cat: "shift" };
  if (t.startsWith("timeoff")) return { Icon: CalendarDays, color: "#0ea5e9", cat: "shift" };
  if (t.startsWith("task")) return { Icon: CheckSquare, color: "#22c55e", cat: "other" };
  if (t.startsWith("memo")) return { Icon: Megaphone, color: "#d4a017", cat: "other" };
  if (t.startsWith("dispatch")) return { Icon: Siren, color: "#e11d48", cat: "other" };
  return { Icon: ActivityIcon, color: "#94a3b8", cat: "other" };
}

const FILTERS: Category[] = ["incident", "checkin", "visitor", "patrol", "shift", "other"];

export default function ActivitiesPage() {
  const { t, i18n } = useTranslation();
  const tenantId = localStorage.getItem("tenantId") || "";

  const { notifications: live, markRead: persistRead, connected } = useNotificationStream(tenantId);
  const [history, setHistory] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // filters
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/${tenantId}/events`, {
        params: { limit: 50 },
        toast: { silentError: true },
      } as any);
      const rows = (res.data?.rows ?? []) as any[];
      setHistory(rows.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        title: e.title || e.eventType || "Evento",
        body: e.body,
        createdAt: e.createdAt,
        read: e.deliveryStatus === "read",
        payload: e.payload,
      })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // merge live SSE events with fetched history, de-duplicated by id, newest first
  const events = useMemo<ActivityEvent[]>(() => {
    const map = new Map<string, ActivityEvent>();
    history.forEach((e) => map.set(e.id, e));
    live.forEach((n) => map.set(n.id, {
      id: n.id,
      eventType: n.eventType,
      title: n.title || n.eventType || "Evento",
      body: n.body,
      createdAt: n.createdAt,
      read: !!n.read,
      payload: (n as any).payload,
    }));
    return Array.from(map.values()).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [history, live]);

  const isRead = useCallback((e: ActivityEvent) => e.read || readIds.has(e.id), [readIds]);

  const markRead = useCallback((id: string) => {
    setReadIds((s) => new Set(s).add(id));
    persistRead(id); // POSTs to the server
  }, [persistRead]);

  const markAllRead = useCallback(() => {
    const unread = events.filter((e) => !isRead(e)).map((e) => e.id);
    if (!unread.length) return;
    setReadIds((s) => { const n = new Set(s); unread.forEach((id) => n.add(id)); return n; });
    unread.forEach((id) => persistRead(id));
  }, [events, isRead, persistRead]);

  const unreadCount = useMemo(() => events.filter((e) => !isRead(e)).length, [events, isRead]);

  // apply search + category + unread filters
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (cat !== "all" && visualFor(e.eventType).cat !== cat) return false;
      if (unreadOnly && isRead(e)) return false;
      if (q && !(`${e.title} ${e.body ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, query, cat, unreadOnly, isRead]);

  // group filtered events by day bucket (today / yesterday / explicit date)
  const groups = useMemo(() => {
    const locale = i18n.language?.startsWith("en") ? "en-US" : i18n.language?.startsWith("pt") ? "pt-BR" : "es-ES";
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const out: { key: string; label: string; items: ActivityEvent[] }[] = [];
    const byKey = new Map<string, { label: string; items: ActivityEvent[] }>();
    for (const e of filtered) {
      const d = new Date(e.createdAt);
      const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
      let key: string, label: string;
      if (diff <= 0) { key = "today"; label = t("activity.group.today"); }
      else if (diff === 1) { key = "yesterday"; label = t("activity.group.yesterday"); }
      else {
        label = d.toLocaleDateString(locale, {
          day: "numeric", month: "long",
          ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
        });
        key = label;
      }
      if (!byKey.has(key)) { const g = { label, items: [] as ActivityEvent[] }; byKey.set(key, g); out.push({ key, ...g }); }
      byKey.get(key)!.items.push(e);
    }
    return out;
  }, [filtered, t, i18n.language]);

  const timeAgo = useCallback((iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return t("activity.time.now");
    if (s < 3600) return t("activity.time.minsAgo", { n: Math.floor(s / 60) });
    if (s < 86400) return t("activity.time.hoursAgo", { n: Math.floor(s / 3600) });
    return t("activity.time.daysAgo", { n: Math.floor(s / 86400) });
  }, [t]);

  const absoluteTime = useCallback((iso: string) => {
    const locale = i18n.language?.startsWith("en") ? "en-US" : i18n.language?.startsWith("pt") ? "pt-BR" : "es-ES";
    return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  }, [i18n.language]);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: t("dashboard.title"), path: "/dashboard" },
          { label: t("activity.title") },
        ]}
      />

      <div className="p-4 sm:p-6">
        <PageContainer width="wide">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <PageHeader
          icon={<ActivityIcon />}
          title={t("activity.title")}
          subtitle={t("activity.subtitle")}
          badges={
            <>
              <StatusBadge tone={connected ? "green" : "slate"}>
                <Radio size={12} className={connected ? "animate-pulse" : ""} />
                {connected ? t("activity.live") : t("activity.offline")}
              </StatusBadge>
              {unreadCount > 0 && (
                <StatusBadge tone="primary" dot={false}>
                  {t("activity.unreadCount", { count: unreadCount })}
                </StatusBadge>
              )}
            </>
          }
          actions={
            <>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={["mr-2 h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                {t("activity.refresh")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-primary border-primary/30 hover:text-primary"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                {t("activity.markAllRead")}
              </Button>
            </>
          }
        />

        {/* ── Toolbar: search + category chips + unread toggle ─────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("activity.search")}
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <Chip active={cat === "all"} onClick={() => setCat("all")}>{t("activity.filters.all")}</Chip>
            {FILTERS.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{t(`activity.filters.${c}`)}</Chip>
            ))}
          </div>

          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={[
              "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              unreadOnly
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t("activity.unreadOnly")}
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card/60">
          {loading ? (
            <SkeletonList />
          ) : error ? (
            <EmptyState
              icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
              title={t("activity.loadError")}
              action={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />{t("activity.refresh")}</Button>}
            />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
              title={t("activity.empty.title")}
              description={t("activity.empty.description")}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-10 w-10 text-muted-foreground" />}
              title={t("activity.noResults.title")}
              description={t("activity.noResults.description")}
            />
          ) : (
            <div className="divide-y divide-border">
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="sticky top-0 z-10 bg-card/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {g.label}
                  </div>
                  {g.items.map((e) => {
                    const { Icon, color } = visualFor(e.eventType);
                    const read = isRead(e);
                    // NOTE (token migration): inside a .map() callback, so the
                    // useFileUrl hook can't be used (hooks rules), and the event
                    // payload only carries a raw photoUrl privateUrl string (no
                    // companion downloadUrl). Left on fileUrlFromPrivate as a
                    // documented transitional fallback; when the backend adds a
                    // token downloadUrl to the activity payload, switch to it.
                    const photoUrl = fileUrlFromPrivate(e.payload?.photoUrl);
                    return (
                      <button
                        key={e.id}
                        onClick={() => !read && markRead(e.id)}
                        className={[
                          "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                          read ? "" : "bg-primary/[0.04]",
                        ].join(" ")}
                      >
                        {/* unread accent */}
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: read ? "transparent" : "var(--primary)" }}
                        />
                        <span
                          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                          style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={["truncate text-sm", read ? "text-foreground/80" : "font-medium text-foreground"].join(" ")}>
                            {e.title}
                          </p>
                          {e.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.body}</p>}
                          {photoUrl && (
                            <img
                              src={photoUrl}
                              alt=""
                              loading="lazy"
                              className="mt-2 h-24 w-24 rounded-lg border border-border object-cover"
                              onError={(ev) => ((ev.currentTarget.style.display = "none"))}
                            />
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground" title={absoluteTime(e.createdAt)}>
                          {timeAgo(e.createdAt)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        </PageContainer>
      </div>
    </AppLayout>
  );
}

/* ── small presentational helpers ─────────────────────────────────────────── */

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-muted/60">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="divide-y divide-border">
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <span className="mt-0.5 h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
