import { useState } from "react";
import { Bell, Moon, Sun, ShieldCheck, AlertTriangle, Footprints, Building2, Home, ShieldAlert, User2, ChevronRight } from "lucide-react";

export interface PreviewBanner {
  title?: string;
  description?: string;
  image?: string | null;
}

/**
 * Live phone preview of the Mi Seguridad (customer) app home screen. Renders the
 * real app layout — greeting header, "PROTECTED" card, stat tiles, the configurable
 * BANNER CAROUSEL, recent activity and the bottom nav — so the operator sees exactly
 * how their banners/content will look while they configure them. Dark + light themes
 * (dark = black/charcoal like the app; light = white with blue accents).
 */
export default function CustomerAppPreview({ banners }: { banners: PreviewBanner[] }) {
  const [dark, setDark] = useState(true);
  const [slide, setSlide] = useState(0);
  const items = banners.length ? banners : [{ title: "Tu banner aquí", description: "Agrega un banner para promocionar tus servicios.", image: null }];
  const active = items[Math.min(slide, items.length - 1)];

  // Theme tokens (kept inline so the preview is independent of the CRM theme).
  const t = dark
    ? {
        screen: "bg-[#0a0a0b] text-white",
        sub: "text-white/55",
        card: "bg-white/[0.04] border-white/10",
        tile: "bg-white/[0.04] border-white/10",
        nav: "bg-[#141416] border-white/10",
        navActive: "bg-white/10 text-white",
        navIdle: "text-white/50",
        bannerFallback: "from-blue-600 to-indigo-700",
        activity: "bg-white/[0.03] border-white/[0.07]",
      }
    : {
        screen: "bg-[#f4f7fb] text-slate-900",
        sub: "text-slate-500",
        card: "bg-white border-slate-200 shadow-sm",
        tile: "bg-white border-slate-200 shadow-sm",
        nav: "bg-white border-slate-200",
        navActive: "bg-blue-600 text-white",
        navIdle: "text-slate-400",
        bannerFallback: "from-blue-500 to-blue-700",
        activity: "bg-white border-slate-200 shadow-sm",
      };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Theme toggle */}
      <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
        <button onClick={() => setDark(true)} className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${dark ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Moon className="size-3.5" /> Oscuro
        </button>
        <button onClick={() => setDark(false)} className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${!dark ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Sun className="size-3.5" /> Claro
        </button>
      </div>

      {/* Phone frame */}
      <div className="relative w-[300px] rounded-[2.6rem] border-[11px] border-neutral-900 bg-neutral-900 shadow-2xl">
        {/* notch */}
        <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />
        <div className={`relative h-[600px] overflow-y-auto rounded-[1.7rem] ${t.screen}`}>
          {/* status bar */}
          <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-medium">
            <span>00:14</span>
            <span className="flex items-center gap-1 opacity-70">▪▪▪ ▾ 6</span>
          </div>

          <div className="space-y-4 px-4 pb-24 pt-3">
            {/* greeting header */}
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-xs ${t.sub}`}>Good evening 🌙</div>
                <div className="text-lg font-bold leading-tight">Michael Urresta</div>
              </div>
              <div className="relative">
                <span className={`grid size-9 place-items-center rounded-full border ${t.card}`}>
                  <Bell className="size-4" />
                </span>
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold text-white">3</span>
              </div>
            </div>

            {/* PROTECTED card */}
            <div className={`rounded-2xl border p-4 ${t.card}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-500">
                  <span className="size-2 rounded-full bg-emerald-500" /> Protected
                </span>
                <ShieldCheck className="size-5 text-emerald-500" />
              </div>
              <div className="mt-2 text-[15px] font-bold leading-snug">Innovation Grounds · Puerta principal</div>
              <div className={`mt-0.5 text-xs ${t.sub}`}>1 guard on duty</div>
            </div>

            {/* stat tiles */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: <User2 className="size-4" />, n: "1", l: "On duty" },
                { icon: <AlertTriangle className="size-4" />, n: "7", l: "Incidents" },
                { icon: <Footprints className="size-4" />, n: "0", l: "Patrols" },
                { icon: <Building2 className="size-4" />, n: "1", l: "Sites" },
              ].map((s, i) => (
                <div key={i} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 ${t.tile}`}>
                  <span className={dark ? "text-white/60" : "text-blue-600"}>{s.icon}</span>
                  <span className="text-sm font-bold">{s.n}</span>
                  <span className={`text-[9px] ${t.sub}`}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* BANNER carousel (the configurable part) */}
            <div>
              <div className="relative overflow-hidden rounded-2xl">
                {active.image ? (
                  <div className="relative h-32 w-full">
                    <img src={active.image} alt={active.title || "Banner"} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                      <div className="text-sm font-bold leading-tight">{active.title || "Banner"}</div>
                      {active.description && <div className="mt-0.5 line-clamp-2 text-[10px] opacity-85">{active.description}</div>}
                    </div>
                  </div>
                ) : (
                  <div className={`flex h-32 w-full flex-col justify-end bg-gradient-to-br ${t.bannerFallback} p-3 text-white`}>
                    <div className="text-sm font-bold leading-tight">{active.title || "Banner"}</div>
                    {active.description && <div className="mt-0.5 line-clamp-2 text-[10px] opacity-90">{active.description}</div>}
                  </div>
                )}
              </div>
              {items.length > 1 && (
                <div className="mt-2 flex justify-center gap-1.5">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${i === slide ? "w-4 bg-primary" : `w-1.5 ${dark ? "bg-white/25" : "bg-slate-300"}`}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* recent activity */}
            <div>
              <div className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${t.sub}`}>Recent activity</div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${t.activity}`}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-500">
                      <ShieldAlert className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium">SOS — Solicitud de emergencia</div>
                      <div className={`text-[9px] ${t.sub}`}>28 jun, 22:38</div>
                    </div>
                    <ChevronRight className={`size-4 ${t.sub}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* bottom nav */}
          <div className={`absolute inset-x-0 bottom-0 flex items-center justify-around border-t px-2 py-2 ${t.nav}`}>
            {[
              { icon: <Home className="size-4" />, l: "Inicio", active: true },
              { icon: <ShieldCheck className="size-4" />, l: "Mi Seguridad", active: false },
              { icon: <User2 className="size-4" />, l: "Mi Cuenta", active: false },
            ].map((n, i) => (
              <span key={i} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium ${n.active ? t.navActive : t.navIdle}`}>
                {n.icon} {n.l}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Vista previa · app Mi Seguridad (cliente)</p>
    </div>
  );
}
