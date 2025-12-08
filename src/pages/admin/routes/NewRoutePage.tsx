import { useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  routeCreateSchema,
  type RouteCreateSchema,
} from "@/lib/validators/route-create.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const guards = [
  { id: "g1", name: "Juan Pérez" },
  { id: "g2", name: "María Gómez" },
];

const sites = [
  { id: "s1", name: "Sede Norte" },
  { id: "s2", name: "Sede Centro" },
  { id: "s3", name: "Sede Sur" },
];

const vehicles = [
  { id: "v1", name: "Toyota Hilux ABC-123" },
  { id: "v2", name: "Nissan Frontier XYZ-987" },
];

const notifyTimes = ["00:05", "00:10", "00:15", "00:30", "01:00"];

const DAY_LABEL: Record<string, string> = {
  sun: "Domingo",
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
};
const ALL_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function NewRoutePage() {
  const form = useForm<RouteCreateSchema>({
    resolver: zodResolver(routeCreateSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      continuous: true,
      dateFrom: "",
      dateTo: "",
      startTime: "00:00",
      endTime: "23:59",
      days: [],
      guardFilter: { departmentId: "", skillsetId: "", categoryId: "" },
      guardId: "",
      siteIds: [],
      vehicleId: "",
      syncHitsBetweenGuards: false,
      forceVehicleRouteOrder: false,
      notifyBefore: "00:15",
      autoCheckInByGeofence: false,
      forceCheckInBeforeStart: false,
    },
    mode: "onBlur",
  });

  const daysText = useMemo(() => {
    const d = form.watch("days") ?? [];
    if (!d.length) return ", , , , , ,";
    return d.map((k: any) => DAY_LABEL[k]).join(", ");
  }, [form.watch("days")]);

  const onSubmit = (data: RouteCreateSchema) => {
    const payload = {
      ...data,
      windowStart:
        data.dateFrom && data.startTime
          ? new Date(`${data.dateFrom}T${data.startTime}:00`).toISOString()
          : null,
      windowEnd:
        data.dateTo && data.endTime
          ? new Date(`${data.dateTo}T${data.endTime}:00`).toISOString()
          : null,
    };
    console.log("Nueva ruta:", payload);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Nueva ruta" },
        ]}
      />

      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre*</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la ruta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Descripción de la ruta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="text-sm font-semibold">Programar Ruta</div>

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.watch("continuous")}
                      onCheckedChange={(v) => form.setValue("continuous", v)}
                      id="continuous"
                    />
                    <Label htmlFor="continuous" className="text-base">
                      Ruta Continua
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="dateFrom"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Desde</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de Inicio</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de Fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateTo"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Hasta</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="days"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Seleccionar Días*</FormLabel>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
                              >
                                <span className="truncate">{daysText}</span>
                                <ChevronDown className="h-4 w-4 opacity-60" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[320px]">
                              {ALL_DAYS.map((d) => {
                                const checked = (field.value || []).includes(d);
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={d}
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      const cur = new Set(field.value || []);
                                      if (v) cur.add(d);
                                      else cur.delete(d);
                                      field.onChange(Array.from(cur));
                                    }}
                                  >
                                    {DAY_LABEL[d]}
                                  </DropdownMenuCheckboxItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="text-sm font-semibold">Filtro de Guardia</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="guardFilter.departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dep-1">Operaciones</SelectItem>
                          <SelectItem value="dep-2">Seguridad Física</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guardFilter.skillsetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conjunto de Habilidades</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Conjunto de Habilidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sk-1">Primeros Auxilios</SelectItem>
                          <SelectItem value="sk-2">Conducción</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guardFilter.categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cat-1">A</SelectItem>
                          <SelectItem value="cat-2">B</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="guardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar Guardia*</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar guardia" />
                    </SelectTrigger>
                    <SelectContent>
                      {guards.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="siteIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seleccionar sitios de publicación*</FormLabel>
                  <Select
                    value={field.value?.[0] ?? ""}
                    onValueChange={(v) => field.onChange(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="text-sm font-semibold">Definir ruta</div>
              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="text-sm font-medium">Puntos y tiempos</div>
                  <Select onValueChange={(v) => console.log("Seleccionar:", v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distancia">Ordenar según la distancia</SelectItem>
                      <SelectItem value="aleatorio">Ordenar de manera aleatoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="px-4 py-3 font-semibold">Sitio de publicación</th>
                        <th className="px-4 py-3 font-semibold">Dirección</th>
                        <th className="px-4 py-3 font-semibold">Golpes</th>
                        <th className="px-4 py-3 font-semibold">Duración</th>
                        <th className="px-4 py-3 font-semibold">Golpes programados</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No hay puntos definidos
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seleccionar vehículo*</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="syncHitsBetweenGuards"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox id="syncHits" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="syncHits" className="cursor-pointer">
                      Sincronizar golpes entre guardias
                    </Label>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="forceVehicleRouteOrder"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox id="forceOrder" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="forceOrder" className="cursor-pointer">
                      Forzar al guardia a seguir la ruta de patrulla vehicular en orden
                    </Label>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="notifyBefore"
                render={({ field }) => (
                  <div className="flex flex-wrap items-center gap-3">
                    <Checkbox
                      id="notify"
                      checked={Boolean(field.value)}
                      onCheckedChange={(v) =>
                        form.setValue("notifyBefore", v ? field.value || "00:15" : "00:15")
                      }
                    />
                    <Label htmlFor="notify" className="cursor-pointer">
                      Enviar notificación de inicio de golpes programados antes
                    </Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="00:15" />
                      </SelectTrigger>
                      <SelectContent>
                        {notifyTimes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="autoCheckInByGeofence"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="autocheck"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="autocheck" className="cursor-pointer">
                      Registro automático de entrada y salida en sitios de publicación según geocerca
                    </Label>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="forceCheckInBeforeStart"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="forcecheck"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="forcecheck" className="cursor-pointer">
                      Forzar registro de entrada antes de comenzar la ruta
                    </Label>
                  </div>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" asChild>
                <Link to="/routes">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={form.formState.isSubmitting}
              >
                Enviar
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => console.log("Guardar como borrador")}
              >
                Guardar como borrador
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
