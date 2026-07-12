import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Shared frame for every Configuración detail page. Instead of a second
 * side menu next to the main app sidebar (two sidebars looked cluttered),
 * the top bar carries a back button to the settings hub (/setting) plus the
 * page title. navKey is kept for API compatibility with existing pages.
 */
export default function SettingsLayout({
  navKey: _navKey,
  title,
  children,
}: {
  navKey: "configuracion" | "suscripcion" | string;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-[calc(100vh-56px)] overflow-hidden bg-muted/20">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: back to the settings hub + page title */}
        <div className="sticky top-0 z-10 bg-card">
          <div className="h-12 flex items-center gap-2 border-b border-border px-4">
            <Link
              to="/setting"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 -ml-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={t("settings.backToSettings", { defaultValue: "Volver a Configuración" })}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("settings.back", { defaultValue: "Configuración" })}
            </Link>
            <span className="text-border select-none" aria-hidden="true">/</span>
            <div className="text-[15px] text-foreground font-medium truncate">{title}</div>
          </div>
        </div>

        {/* Scroll container */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
