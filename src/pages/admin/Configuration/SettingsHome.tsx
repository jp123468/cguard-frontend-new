import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import NAVS from "@/data/settings-nav.json";
import { settingsIcon } from "@/config/settingsIcons";

type SubItem = { id: string; label: string; path: string; icon?: string; desc?: string };
type Section = { label?: string; items: SubItem[] };

export default function SettingsHome() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const nav = (NAVS as any).configuracion as { title?: string; sections: Section[] };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nav.sections;
    return nav.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => {
          const label = t(`settings.configuracion.${it.id}`, { defaultValue: it.label }) as string;
          return label.toLowerCase().includes(q) || (it.desc ?? "").toLowerCase().includes(q);
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [nav.sections, query, t]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#D49A24] to-[#9A6705] p-6 shadow-md sm:p-8">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("settings.home.heroTitle", { defaultValue: "Configuración" })}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/85">
              {t("settings.home.heroSubtitle", {
                defaultValue: "Administra tu cuenta, tu empresa y cómo opera la plataforma. Elige una categoría para empezar.",
              })}
            </p>

            <div className="relative mt-5 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("settings.home.searchPlaceholder", { defaultValue: "Buscar un ajuste..." })}
                className="w-full rounded-xl border border-white/30 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:ring-2 focus:ring-white/60"
              />
            </div>
          </div>
        </div>

        {/* Category groups */}
        <div className="mt-8 space-y-9">
          {sections.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("settings.noResults", { defaultValue: "Sin resultados" })}
            </div>
          ) : (
            sections.map((sec, idx) => {
              const slug = String(sec.label ?? "")
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_]/g, "");
              return (
                <section key={idx}>
                  {sec.label ? (
                    <div className="mb-3 flex items-center gap-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t(`settings.section.${slug}`, { defaultValue: sec.label })}
                      </h2>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sec.items.map((item) => {
                      const Icon = settingsIcon(item.icon);
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          className="group relative flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#E8C879] hover:shadow-md"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF3D6] text-primary transition-colors group-hover:bg-[#FCE6B0]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="truncate text-sm font-semibold text-foreground">
                                {t(`settings.configuracion.${item.id}`, { defaultValue: item.label })}
                              </h3>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                            </div>
                            {item.desc ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.desc}</p>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
