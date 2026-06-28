import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight, Settings2 } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import NAVS from "@/data/settings-nav.json";
import { settingsIcon } from "@/config/settingsIcons";
import { PageContainer, PageHeader, FadeIn, Stagger, EmptyState } from "@/components/kit";

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
      <PageContainer width="wide">
        {/* Hero */}
        <PageHeader
          icon={<Settings2 />}
          title={t("settings.home.heroTitle", { defaultValue: "Configuración" })}
          subtitle={t("settings.home.heroSubtitle", {
            defaultValue:
              "Administra tu cuenta, tu empresa y cómo opera la plataforma. Elige una categoría para empezar.",
          })}
          actions={
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("settings.home.searchPlaceholder", { defaultValue: "Buscar un ajuste..." })}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
          }
        />

        {/* Category groups */}
        <div className="space-y-9">
          {sections.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title={t("settings.noResults", { defaultValue: "Sin resultados" })}
            />
          ) : (
            sections.map((sec, idx) => {
              const slug = String(sec.label ?? "")
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_]/g, "");
              return (
                <FadeIn key={idx} delay={idx * 0.05}>
                  <section>
                    {sec.label ? (
                      <div className="mb-3 flex items-center gap-3">
                        <h2 className="cg-eyebrow">
                          {t(`settings.section.${slug}`, { defaultValue: sec.label })}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    ) : null}

                    <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sec.items.map((item) => {
                        const Icon = settingsIcon(item.icon);
                        return (
                          <Link
                            key={item.id}
                            to={item.path}
                            className="group relative flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/20">
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
                    </Stagger>
                  </section>
                </FadeIn>
              );
            })
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}
