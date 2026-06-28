import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { StatCard, Stagger, EmptyState } from '@/components/kit';
import {
  Users, MapPin, Shield, UserSquare2, MapPinned, ActivitySquare, SlidersHorizontal, LayoutGrid,
} from "lucide-react";

/* ----- Definición de widgets disponibles ----- */
type WidgetId =
  | "clientes"
  | "sitios"
  | "guardias"
  | "equipo"
  | "registros"
  | "fichados";

type Accent = "green" | "blue" | "primary" | "slate" | "orange" | "red";

type WidgetDef = {
  id: WidgetId;
  title: string;          // encabezado de la tarjeta
  subtitle: string;       // línea inferior
  Icon: any;
  accent: Accent;         // token de color del kit StatCard
};

const WIDGETS: WidgetDef[] = [
  {
    id: "clientes",
    title: "Clientes",
    subtitle: "Clientes Activos",
    Icon: Users,
    accent: "green",
  },
  {
    id: "sitios",
    title: "Puestos de Vigilancia",
    subtitle: "Puestos de Vigilancia Activos",
    Icon: MapPin,
    accent: "blue",
  },
  {
    id: "guardias",
    title: "security-guards",
    subtitle: "Vigilantes Activos",
    Icon: Shield,
    accent: "primary",
  },
  {
    id: "equipo",
    title: "Equipo administrativo",
    subtitle: "Usuarios Activos",
    Icon: UserSquare2,
    accent: "slate",
  },
  {
    id: "registros",
    title: "Registros",
    subtitle: "Hoy",
    Icon: MapPinned,
    accent: "orange",
  },
  {
    id: "fichados",
    title: "Fichados",
    subtitle: "Hoy",
    Icon: ActivitySquare,
    accent: "red",
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
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="size-4" />
              {t('dashboard.widgets.manage', 'Widgets')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 max-h-56 overflow-auto">
            <div className="space-y-1">
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
        <EmptyState
          icon={<LayoutGrid />}
          title={t('dashboard.noWidgets.title', 'No widgets enabled')}
          description={t('dashboard.noWidgets.desc', 'Please enable at least one widget to see data on the board.')}
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map(w => {
            const Icon = w.Icon;
            return (
              <StatCard
                key={w.id}
                label={t(`dashboard.widgets.${w.id}.title`, w.title)}
                value={data[w.id] ?? 0}
                hint={t(`dashboard.widgets.${w.id}.subtitle`, w.subtitle)}
                icon={<Icon />}
                accent={w.accent}
              />
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
