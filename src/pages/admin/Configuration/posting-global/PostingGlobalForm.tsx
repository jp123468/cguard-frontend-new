import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  enforceClockInBeforeCheck: z.boolean().default(false),
  notifyGeofenceEnterExit: z.boolean().default(false),
  enableCheckinInsideGeofence: z.boolean().default(false),
  enableCheckoutInsideGeofence: z.boolean().default(false),
  enforcePostOrderAck: z.boolean().default(false),
  autoCheckoutAfter24h: z.boolean().default(false),
  remindOneDeliveryBeforeLeave: z.boolean().default(false),
  forceOneDeliveryBeforeLeave: z.boolean().default(false),
  allowGuardSeeEquipment: z.boolean().default(false),
  autoPublishClientOpenShifts: z.boolean().default(false),
  forceDeliveryAckEnabled: z.boolean().default(false),
  forceDeliveryAckLastHours: z.enum(["24h", "2d", "4d", "1w"]).default("24h"),
});

export type PostingGlobalValues = z.infer<typeof schema>;

type Props = {
  defaultValues?: Partial<PostingGlobalValues>;
  onSubmit?: (values: PostingGlobalValues) => Promise<void> | void;
};

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-3 py-3">{children}</div>;
}

export default function PostingGlobalForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<PostingGlobalValues>({
    resolver: zodResolver(schema) as Resolver<PostingGlobalValues>,
    defaultValues: {
      enforceClockInBeforeCheck: defaultValues?.enforceClockInBeforeCheck ?? true,
      notifyGeofenceEnterExit: defaultValues?.notifyGeofenceEnterExit ?? false,
      enableCheckinInsideGeofence: defaultValues?.enableCheckinInsideGeofence ?? false,
      enableCheckoutInsideGeofence: defaultValues?.enableCheckoutInsideGeofence ?? false,
      enforcePostOrderAck: defaultValues?.enforcePostOrderAck ?? false,
      autoCheckoutAfter24h: defaultValues?.autoCheckoutAfter24h ?? true,
      remindOneDeliveryBeforeLeave: defaultValues?.remindOneDeliveryBeforeLeave ?? false,
      forceOneDeliveryBeforeLeave: defaultValues?.forceOneDeliveryBeforeLeave ?? false,
      allowGuardSeeEquipment: defaultValues?.allowGuardSeeEquipment ?? false,
      autoPublishClientOpenShifts: defaultValues?.autoPublishClientOpenShifts ?? false,
      forceDeliveryAckEnabled: defaultValues?.forceDeliveryAckEnabled ?? false,
      forceDeliveryAckLastHours: defaultValues?.forceDeliveryAckLastHours ?? "24h",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit?.(values);
  });

  const ackEnabled = form.watch("forceDeliveryAckEnabled");

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-2">
        <p className="mb-4 text-sm font-semibold text-red-600">
          Los cambios se reflejarán en todos los sitios de publicación
        </p>

        <FormField
          control={form.control}
          name="enforceClockInBeforeCheck"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer" onClick={() => field.onChange(!field.value)}>
                    Imponer registro antes de fichaje
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifyGeofenceEnterExit"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Notificar cuando el guardia entre o salga de la geocerca
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableCheckinInsideGeofence"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Habilitar registro dentro de geovalla
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableCheckoutInsideGeofence"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Habilitar salida dentro de geovalla
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enforcePostOrderAck"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Imponer reconocimiento de orden de publicación
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoCheckoutAfter24h"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Habilitar auto salida del guardia después de 24 horas
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remindOneDeliveryBeforeLeave"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Recordar al guardia enviar al menos un registro de entrega antes de salir del sitio
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="forceOneDeliveryBeforeLeave"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Forzar al guardia a enviar al menos un registro de entrega antes de salir del sitio
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowGuardSeeEquipment"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Permitir que el guardia vea los detalles del equipo de seguridad
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoPublishClientOpenShifts"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex items-center gap-2">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Publicar automáticamente turnos abiertos solicitados por el cliente
                  </Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="forceDeliveryAckEnabled"
          render={({ field }) => (
            <FormItem>
              <Row>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex flex-wrap items-center gap-3">
                  <Label onClick={() => field.onChange(!field.value)} className="cursor-pointer">
                    Forzar reconocimiento de entrega para las últimas
                  </Label>
                  <FormField
                    control={form.control}
                    name="forceDeliveryAckLastHours"
                    render={({ field: hoursField }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={hoursField.value}
                            onValueChange={hoursField.onChange}
                            disabled={!ackEnabled}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24h">24 Horas</SelectItem>
                              <SelectItem value="2d">2 Días</SelectItem>
                              <SelectItem value="4d">4 Días</SelectItem>
                              <SelectItem value="1w">1 Semana</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </Row>
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" className="px-6">Guardar Configuración</Button>
        </div>
      </form>
    </Form>
  );
}
