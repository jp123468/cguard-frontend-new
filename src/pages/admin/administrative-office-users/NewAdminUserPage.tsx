"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { clientService } from "@/lib/api/clientService";
import { postSiteService } from "@/lib/api/postSiteService";

import {
  accessLevels,
  newAdminUserSchema,
  type NewAdminUserValues,
} from "@/lib/validators/new-admin-user.schema";

/* dynamic options loaded from API */
const CLIENT_OPTIONS_PLACEHOLDER: Array<{ id: string; name: string }> = [];

export default function NewAdminUserPage() {
  const form = useForm<NewAdminUserValues>({
    resolver: zodResolver(newAdminUserSchema),
    defaultValues: {
      name: "",
      email: "",
      accessLevel: undefined as unknown as NewAdminUserValues["accessLevel"],
      clientId: "",
      postSiteId: "",
    },
    mode: "onTouched",
  });

  const { handleSubmit, control, formState } = form;
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string }>>(CLIENT_OPTIONS_PLACEHOLDER);
  const [siteOptions, setSiteOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const clients = await clientService.getClients({});
        setClientOptions((clients as any).rows || []);
      } catch (err) {
        console.error('No se pudieron cargar clientes', err);
        setClientOptions([]);
      }
    })();
  }, []);

  // watch clientId changes using form getValues in an interval to avoid adding useWatch import
  useEffect(() => {
    let last = '';
    let mounted = true;
    const iv = setInterval(async () => {
      try {
        const vals = (form.getValues as any) ? (form.getValues() as any) : {};
        const clientId = vals.clientId || '';
        if (clientId !== last) {
          last = clientId;
          if (!clientId) {
            setSiteOptions([]);
            return;
          }
          try {
            const res = await postSiteService.list({ clientId }, { limit: 1000, offset: 0 });
            if (!mounted) return;
            setSiteOptions((res as any).rows || []);
          } catch (err) {
            console.error('No se pudieron cargar sitios para cliente', clientId, err);
            setSiteOptions([]);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 300);
    return () => { mounted = false; clearInterval(iv); };
  }, [form]);

  const onSubmit = (values: NewAdminUserValues) => {
    // TODO: conectar a tu API
    console.log("Nuevo usuario:", values);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Nuevo Usuario" },
        ]}
      />

      <div className="p-4">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
            {/* Fila 1 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre*</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre*" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico*</FormLabel>
                    <FormControl>
                      <Input placeholder="Correo Electrónico*" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fila 2 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de Acceso*</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nivel de Acceso*" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accessLevels.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar Clientes*</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar Clientes*" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientOptions.length === 0 && (
                          <SelectItem value="__void__" disabled>
                            Sin opciones
                          </SelectItem>
                        )}
                        {clientOptions.map((c) => (
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
            </div>

            {/* Fila 3 (col-span-2) */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <FormField
                control={control}
                name="postSiteId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Asignar Sitios de Publicación</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar Sitios de Publicación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {siteOptions.length === 0 && (
                          <SelectItem value="__void__" disabled>
                            Sin opciones
                          </SelectItem>
                        )}
                        {siteOptions.map((s) => (
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
            </div>

            {/* Botón enviar alineado a la derecha */}
            <div className="flex justify-end">
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
