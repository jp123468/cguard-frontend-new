import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  dispatchCreateSchema,
  type DispatchCreateSchema,
} from "@/lib/validators/dispatch-create.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const clientes = [
  { id: "cli-1", name: "Cliente A" },
  { id: "cli-2", name: "Cliente B" },
  { id: "cli-3", name: "Cliente C" },
];

const sitios = [
  { id: "site-1", name: "Sede Norte" },
  { id: "site-2", name: "Sede Centro" },
  { id: "site-3", name: "Sede Sur" },
];

const guardias = [
  { id: "g-1", name: "Juan Pérez" },
  { id: "g-2", name: "María Gómez" },
  { id: "g-3", name: "Luis Andrade" },
];

const prioridades = [
  { id: "alta", name: "Alta" },
  { id: "media", name: "Media" },
  { id: "baja", name: "Baja" },
];

const tiposLlamador = [
  { id: "cliente", name: "Cliente" },
  { id: "guardia", name: "Guardia" },
  { id: "supervisor", name: "Supervisor" },
];

const tiposIncidente = [
  { id: "robo", name: "Robo" },
  { id: "vandalismo", name: "Vandalismo" },
  { id: "accidente", name: "Accidente" },
  { id: "otro", name: "Otro" },
];

export default function NewDispatchPage() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>("");

  const form = useForm<DispatchCreateSchema>({
    resolver: zodResolver(dispatchCreateSchema),
    defaultValues: {
      clientId: "",
      siteId: "",
      guardId: "",
      priority: "media",
      callerType: "",
      callerName: "",
      location: "",
      incidentType: "",
      incidentDate: "",
      incidentTime: "",
      incidentDetails: "",
      actionsTaken: "",
      internalNotes: "",
      attachment: undefined,
    },
    mode: "onBlur",
  });

  const onSubmit = (data: DispatchCreateSchema) => {
    const payload = {
      ...data,
      incidentAt:
        data.incidentDate && data.incidentTime
          ? new Date(`${data.incidentDate}T${data.incidentTime}:00`).toISOString()
          : null,
    };
    console.log("Nuevo despacho:", payload);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Nuevo Despacho" },
        ]}
      />

      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sitio de publicación*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {sitios.map((s) => (
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

              <FormField
                control={form.control}
                name="guardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar Guardia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {guardias.map((g) => (
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {prioridades.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
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
                name="callerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Llamador*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposLlamador.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
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
                name="callerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del llamador*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-4 py-3 text-sm font-semibold">
                Detalles del incidente
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Ubicación del incidente*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidentType"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Tipo de Incidente*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposIncidente.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="incidentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha del Incidente*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora del Incidente*</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="incidentDetails"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Detalles del incidente*</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="actionsTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acciones tomadas</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas internas</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="attachment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjunto</FormLabel>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        form.setValue("attachment", f);
                        setFileName(f ? f.name : "");
                      }}
                    />
                    {fileName && (
                      <span className="text-sm text-muted-foreground">{fileName}</span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" asChild>
                <Link to="/dispatch-tickets">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={form.formState.isSubmitting}
              >
                Enviar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
