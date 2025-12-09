import { z } from "zod";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useMemo } from "react";

/* ------------------------ Schema y tipos ------------------------ */
const Schema = z.object({
  currency: z.string().default("USD"),
  timeFormat: z.string().default("24h"),
  dateFormat: z.string().default("MMM d, yyyy"),
  weekStartsOn: z.string().default("Lunes"),
  gracePeriod: z.string().default("none"), // "none" | "5" | "10" | ...
  enableSkillSet: z.boolean().default(false),
  enableDepartment: z.boolean().default(false),
  photoTimestamp: z.boolean().default(false),
  removeTimezone: z.boolean().default(false),
  totalTimeAsDecimals: z.boolean().default(false),
  attendanceMatchThreshold: z.boolean().default(false),
  showIncidentIconOnMap: z.boolean().default(false),
});

export type OtherSettingsValues = z.output<typeof Schema>;

const defaultValues: OtherSettingsValues = Schema.parse({});

/* ------------------------ Sub-componente de campos ------------------------ */
function Fields() {
  const { control } = useFormContext<OtherSettingsValues>();
  const graceOptions = useMemo(
    () => [
      { v: "none", l: "None" },
      { v: "5", l: "5 min" },
      { v: "10", l: "10 min" },
      { v: "15", l: "15 min" },
      { v: "20", l: "20 min" },
      { v: "25", l: "25 min" },
      { v: "30", l: "30 min" },
    ],
    []
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Seleccionar Moneda */}
        <FormField
          control={control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seleccionar Moneda</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">US Dollar</SelectItem>
                    <SelectItem value="EUR">Euro</SelectItem>
                    <SelectItem value="GBP">British Pound</SelectItem>
                    <SelectItem value="MXN">Mexican Peso</SelectItem>
                    <SelectItem value="COP">Colombian Peso</SelectItem>
                    <SelectItem value="PEN">Peruvian Sol</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Formato de Hora */}
        <FormField
          control={control}
          name="timeFormat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formato de Hora</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 Horas</SelectItem>
                    <SelectItem value="12h">12 Horas (AM/PM)</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Formato de Fecha */}
        <FormField
          control={control}
          name="dateFormat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formato de Fecha</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="e.g. Jan 20, 2023" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MMM d, yyyy">Jan 20, 2023</SelectItem>
                    <SelectItem value="dd/MM/yyyy">20/01/2023</SelectItem>
                    <SelectItem value="MM/dd/yyyy">01/20/2023</SelectItem>
                    <SelectItem value="yyyy-MM-dd">2023-01-20</SelectItem>
                    <SelectItem value="d MMM yyyy">20 Jan 2023</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Semana comienza el */}
        <FormField
          control={control}
          name="weekStartsOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>La semana comienza el</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona día" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Período de gracia (píldoras) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Establezca un período de gracia para determinar si un turno se considera tarde.
          </label>
          <Controller
            control={control}
            name="gracePeriod"
            render={({ field }) => (
              <ToggleGroup
                type="single"
                value={field.value}
                onValueChange={(v) => field.onChange(v || "none")}
                className="flex flex-wrap gap-2"
              >
                {graceOptions.map((o) => (
                  <ToggleGroupItem key={o.v} value={o.v} className="px-4">
                    {o.l}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </div>

        {/* Checkboxes */}
        {[
          { name: "enableSkillSet", label: "Habilitar Conjunto de Habilidades en la Programación" },
          { name: "enableDepartment", label: "Habilitar Departamento en la Programación" },
          { name: "photoTimestamp", label: "Habilitar marca de tiempo en fotos tomadas por los guardias" },
        ].map((row) => (
          <FormField
            key={row.name}
            control={control}
            name={row.name as any}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">{row.label}</FormLabel>
              </FormItem>
            )}
          />
        ))}

        {/* Con tooltips explicativos */}
        <FormField
          control={control}
          name="removeTimezone"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal flex items-center gap-2">
                Eliminar zona horaria en todo el sistema
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground"><Info className="h-4 w-4" /></button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Muestra todas las horas sin conversión de zona horaria.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="totalTimeAsDecimals"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">Mostrar tiempo total como horas decimales</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="attendanceMatchThreshold"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal flex items-center gap-2">
                Umbral de Coincidencia de Horario de Asistencia
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground"><Info className="h-4 w-4" /></button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Define el margen para emparejar registros con turnos.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="showIncidentIconOnMap"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal flex items-center gap-2">
                Mostrar ícono de incidente en el mapa
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground"><Info className="h-4 w-4" /></button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Muestra indicadores de incidentes activos sobre el mapa.
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
            </FormItem>
          )}
        />
      </div>
    </TooltipProvider>
  );
}

export default function OtherSettingsForm({
  initialValues,
  onSubmit,
}: {
  initialValues?: Partial<OtherSettingsValues>;
  onSubmit?: (v: OtherSettingsValues) => void;
}) {
  const methods = useForm<z.input<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: { ...defaultValues, ...initialValues },
    mode: "onChange",
  });


  const submit = methods.handleSubmit((v) => {
    onSubmit?.(v as OtherSettingsValues);
  });



  return (
    <Form {...methods}>
      <FormProvider {...methods}>
        <form onSubmit={submit} className="space-y-6">
          <Fields />
          <div className="flex justify-end">
            <Button type="submit">Guardar Configuración</Button>
          </div>
        </form>
      </FormProvider>
    </Form>
  );
}
