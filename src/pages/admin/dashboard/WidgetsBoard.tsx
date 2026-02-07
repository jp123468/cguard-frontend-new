import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent } from "@/components/ui/popover";
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
  };
};

const WIDGETS: WidgetDef[] = [
  {
    id: "clientes",
    title: "Clientes",
    subtitle: "Clientes Activos",
    Icon: Users,
    color: { text: "text-emerald-600", iconBg: "bg-emerald-50" },
  },
  {
    id: "sitios",
    title: "Sitios de publicación",
    subtitle: "Sitios de Publicación Activos",
    Icon: MapPin,
    color: { text: "text-blue-600", iconBg: "bg-blue-50" },
  },
  {
    id: "guardias",
    title: "security-guards",
    subtitle: "Guardias Activos",
    Icon: Shield,
    color: { text: "text-violet-600", iconBg: "bg-violet-50" },
  },
  {
    id: "equipo",
    title: "Equipo administrativo",
    subtitle: "Usuarios Activos",
    Icon: UserSquare2,
    color: { text: "text-cyan-600", iconBg: "bg-cyan-50" },
  },
  {
    id: "registros",
    title: "Registros",
    subtitle: "Hoy",
    Icon: MapPinned,
    color: { text: "text-amber-600", iconBg: "bg-amber-50" },
  },
  {
    id: "fichados",
    title: "Fichados",
    subtitle: "Hoy",
    Icon: ActivitySquare,
    color: { text: "text-rose-600", iconBg: "bg-rose-50" },
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
          <PopoverContent className="w-72 p-3">
            <div className="space-y-2">
              {WIDGETS.map(w => (
                <label key={w.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={enabled.has(w.id)}
                    onCheckedChange={(v) => toggle(w.id, v)}
                  />
                  <span className="text-sm">{w.title}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Estado vacío */}
      {items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">No hay widgets habilitados.</p>
          <p className="text-sm">Por favor, habilita al menos un widget para ver datos en la pantalla.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {items.map(w => (
            <StatCard
              key={w.id}
              title={w.title}
              value={data[w.id] ?? 0}
              subtitle={w.subtitle}
              Icon={w.Icon}
              colorText={w.color.text}
              iconBg={w.color.iconBg}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----- Tarjeta de métrica ----- */
function StatCard({
  title, value, subtitle, Icon, colorText, iconBg,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  Icon: any;
  colorText: string;
  iconBg: string;
}) {
  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className={cn("h-6 w-6 grid place-items-center rounded-full", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", colorText)} />
        </div>
        <span className={cn(colorText)}>{title}</span>
      </div>

      <div className={cn("mt-3 text-4xl font-semibold", colorText)}>{value}</div>

      <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>
    </Card>
  );
}