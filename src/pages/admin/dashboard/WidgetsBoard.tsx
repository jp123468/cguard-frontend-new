import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users, MapPin, Shield, UserSquare2, MapPinned, ActivitySquare,
} from "lucide-react";

/* ----- Definición de widgets disponibles ----- */
type WidgetId =
  | "clientes"
  | "sitios"
  | "guardias"
  | "equipo"
  | "registros"
  | "fichados";

type WidgetDef = {
  id: WidgetId;
  title: string;          // encabezado de la tarjeta
  subtitle: string;       // línea inferior
  Icon: any;
  // clases de color por widget
  color: {
    text: string;         // para el número y título
    iconBg: string;       // fondo suave del icono
    accent: string;       // hex color for top bar + shadow
  };
};

const WIDGETS: WidgetDef[] = [
  {
    id: "clientes",
    title: "Clientes",
    subtitle: "Clientes Activos",
    Icon: Users,
    color: { text: "text-emerald-500", iconBg: "bg-emerald-500/10", accent: "#10b981" },
  },
  {
    id: "sitios",
    title: "Puestos de Vigilancia",
    subtitle: "Puestos de Vigilancia Activos",
    Icon: MapPin,
    color: { text: "text-blue-500", iconBg: "bg-blue-500/10", accent: "#3b82f6" },
  },
  {
    id: "guardias",
    title: "security-guards",
    subtitle: "Guardias Activos",
    Icon: Shield,
    color: { text: "text-violet-500", iconBg: "bg-violet-500/10", accent: "#8b5cf6" },
  },
  {
    id: "equipo",
    title: "Equipo administrativo",
    subtitle: "Usuarios Activos",
    Icon: UserSquare2,
    color: { text: "text-cyan-500", iconBg: "bg-cyan-500/10", accent: "#06b6d4" },
  },
  {
    id: "registros",
    title: "Registros",
    subtitle: "Hoy",
    Icon: MapPinned,
    color: { text: "text-amber-500", iconBg: "bg-amber-500/10", accent: "#C8860A" },
  },
  {
    id: "fichados",
    title: "Fichados",
    subtitle: "Hoy",
    Icon: ActivitySquare,
    color: { text: "text-rose-500", iconBg: "bg-rose-500/10", accent: "#f43f5e" },
  },
];

/* ----- Props con totales (sin servicios) ----- */
export type DashboardData = Partial<Record<WidgetId, number>>;

export default function WidgetsBoard({
  data = {},
  defaultEnabled = ["clientes", "sitios", "guardias", "equipo", "registros", "fichados"] as WidgetId[],
}: {
  data?: DashboardData;           // { clientes: 2, sitios: 3, ... }
  defaultEnabled?: WidgetId[];    // cuáles arrancan visibles
}) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<Set<WidgetId>>(new Set(defaultEnabled));

  const items = useMemo(
    () => WIDGETS.filter(w => enabled.has(w.id)),
    [enabled]
  );

  const toggle = (id: WidgetId, checked: boolean | "indeterminate") => {
    const next = new Set(enabled);
    checked ? next.add(id) : next.delete(id);
    setEnabled(next);
  };

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex items-center justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="px-3 py-1 text-sm">
              {t('dashboard.widgets.manage', 'Widgets')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 max-h-56 overflow-auto">
            <div className="space-y-2">
              {WIDGETS.map(w => (
                <label key={w.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted cursor-pointer min-w-0">
                  <Checkbox
                    checked={enabled.has(w.id)}
                    onCheckedChange={(v) => toggle(w.id, v)}
                  />
                  <span className="text-sm truncate">{t(`dashboard.widgets.${w.id}.title`, w.title)}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Estado vacío */}
      {items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">{t('dashboard.noWidgets.title', 'No widgets enabled')}</p>
          <p className="text-sm">{t('dashboard.noWidgets.desc', 'Please enable at least one widget to see data on the board.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map(w => (
            <StatCard
              key={w.id}
              title={t(`dashboard.widgets.${w.id}.title`, w.title)}
              value={data[w.id] ?? 0}
              subtitle={t(`dashboard.widgets.${w.id}.subtitle`, w.subtitle)}
              Icon={w.Icon}
              colorText={w.color.text}
              iconBg={w.color.iconBg}
              accentColor={w.color.accent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----- Tarjeta de métrica ----- */
function StatCard({
  title, value, subtitle, Icon, colorText, iconBg, accentColor,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  Icon: any;
  colorText: string;
  iconBg: string;
  accentColor: string;
}) {
  return (
    <div
      className="relative rounded-2xl bg-card border border-border overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)" }}
    >
      {/* Accent bar on top */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accentColor }} />

      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn("h-9 w-9 grid place-items-center rounded-xl flex-shrink-0", iconBg)}
            style={{ boxShadow: `0 2px 8px ${accentColor}30` }}
          >
            <Icon className={cn("h-4.5 w-4.5", colorText)} />
          </div>
        </div>

        <div className={cn("text-3xl md:text-4xl font-bold tabular-nums", colorText)}>
          {value}
        </div>

        <div className="mt-1.5">
          <div className="text-[12px] font-semibold text-card-foreground truncate leading-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}