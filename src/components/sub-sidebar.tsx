import { NavLink } from "react-router-dom";
import NAVS from "../../src/data/settings-nav.json";
import { useTranslation } from 'react-i18next';

type SubItem = { id: string; label: string; path: string };
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
  const dict = NAVS as NavRecord;
  const nav = dict[String(navKey)];
  if (!nav) return null;

  const useSticky = heightOffset > 0;

  return (
    <aside
      className={[
        "w-64 shrink-0 border-r border-gray-200 bg-white",
        "overflow-y-auto",
        useSticky
          ? `sticky top-[${heightOffset}px] h-[calc(100vh-${heightOffset}px)]`
          : "h-full",
        className ?? "",
      ].join(" ")}
    >
      {/* Título principal */}
      <div className="px-4 py-3 text-sm font-semibold text-gray-400">
        {t(`settings.${navKey}.title`, { defaultValue: nav.title ?? "Menú" })}
      </div>

      <nav className="pb-6">
        {nav.sections.map((sec, idx) => (
          <div key={idx} className="px-2">
            {/* Si la sección tiene label, se muestra */}
            {sec.label ? (
              <div className="px-2 py-2 text-[12px] font-bold text-blue-700 uppercase tracking-wide">
                {(() => {
                  // create a slug from the section label to use as translation key
                  const slug = String(sec.label)
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "");
                  return t(`settings.section.${slug}`, { defaultValue: sec.label });
                })()}
              </div>
            ) : null}

            <ul
              className={[
                "space-y-1",
                sec.label ? "pl-4" : "pl-0", // 👈 Padding solo si tiene label
              ].join(" ")}
            >
              {sec.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      [
                        "block rounded-md px-3 py-2 text-[12px] font-semibold transition-colors",
                        isActive
                          ? "bg-gradient-to-r from-[#FFF0F0] to-[#FFEAEA] text-[#F36A6D] border-l-4 border-[#F36A6D]"
                          : "text-[#0C2459] hover:bg-gray-50",
                      ].join(" ")
                    }
                  >
                    {t(`settings.${navKey}.${item.id}`, { defaultValue: item.label })}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
