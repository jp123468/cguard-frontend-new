import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import NAVS from "../../src/data/settings-nav.json";
import { useTranslation } from "react-i18next";
import { Search, Settings } from "lucide-react";
import { settingsIcon } from "@/config/settingsIcons";

type SubItem = { id: string; label: string; path: string; icon?: string };
type Section = { label?: string; items: SubItem[] };
type NavDef = { title?: string; sections: Section[] };
type NavRecord = Record<string, NavDef>;

export default function SubSidebar({
  navKey,
  heightOffset = 0,
  className,
}: {
  navKey: keyof NavRecord | string;
  heightOffset?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const dict = NAVS as NavRecord;
  const nav = dict[String(navKey)];

  const sectionsToShow = useMemo(() => {
    if (!nav) return [];
    const q = query.trim().toLowerCase();
    if (!q) return nav.sections;
    return nav.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) =>
          (t(`settings.${navKey}.${it.id}`, { defaultValue: it.label }) as string)
            .toLowerCase()
            .includes(q),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [nav, query, t, navKey]);

  if (!nav) return null;

  const useSticky = heightOffset > 0;

  return (
    <aside
      className={[
        "w-64 shrink-0 border-r border-border bg-card flex flex-col",
        useSticky
          ? `sticky top-[${heightOffset}px] h-[calc(100vh-${heightOffset}px)]`
          : "h-full",
        className ?? "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF3D6] text-[#C8860A]">
            <Settings className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">
              {t(`settings.${navKey}.title`, { defaultValue: nav.title ?? "Menú" })}
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {t("settings.subtitle", { defaultValue: "Administra tu cuenta y empresa" })}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("settings.searchPlaceholder", { defaultValue: "Buscar ajuste..." })}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-[#C8860A] focus:ring-1 focus:ring-[#C8860A]/30"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sectionsToShow.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
            {t("settings.noResults", { defaultValue: "Sin resultados" })}
          </div>
        ) : (
          sectionsToShow.map((sec, idx) => {
            const slug = String(sec.label ?? "")
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, "");
            return (
              <div key={idx} className="mb-4 last:mb-0">
                {sec.label ? (
                  <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t(`settings.section.${slug}`, { defaultValue: sec.label })}
                  </div>
                ) : null}

                <ul className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = settingsIcon(item.icon);
                    return (
                      <li key={item.id}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            [
                              "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                              isActive
                                ? "bg-[#FFF8E6] text-[#A6700A] shadow-sm ring-1 ring-[#F0D9A0]"
                                : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                            ].join(" ")
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                className={[
                                  "h-4 w-4 shrink-0 transition-colors",
                                  isActive ? "text-[#C8860A]" : "text-muted-foreground group-hover:text-foreground",
                                ].join(" ")}
                              />
                              <span className="truncate">
                                {t(`settings.${navKey}.${item.id}`, { defaultValue: item.label })}
                              </span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
