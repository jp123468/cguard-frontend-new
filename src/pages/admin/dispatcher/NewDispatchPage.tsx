import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  dispatchCreateSchema,
  type DispatchCreateSchema,
} from "@/lib/validators/dispatch-create.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
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

import { clientService } from "@/lib/api/clientService";
import IncidentTypesService from "@/services/incident-types.service";
import api from "@/lib/api";
import { postSiteService } from "@/lib/api/postSiteService";
import { toast } from "sonner";

// Datos cargados desde backend
// Se usan estados vacíos y se rellenan en useEffect
// Cada elemento tiene { id, name }


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

// tiposIncidente se carga desde backend en el estado `tiposIncidente`

export default function NewDispatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [clientes, setClientes] = useState<Array<{ id: string; name: string }>>([]);
  const [sitios, setSitios] = useState<Array<{ id: string; name: string }>>([]);
  const [guardias, setGuardias] = useState<Array<{ id: string; name: string }>>([]);
  const [tiposIncidente, setTiposIncidente] = useState<Array<{ id: string; name: string }>>([]);
  const [clienteFilter, setClienteFilter] = useState("");
  const [sitioFilter, setSitioFilter] = useState("");
  const [guardFilter, setGuardFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const clienteInputRef = useRef<HTMLInputElement | null>(null);
  const sitioInputRef = useRef<HTMLInputElement | null>(null);
  const guardInputRef = useRef<HTMLInputElement | null>(null);
  const tipoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const incidentDateRef = useRef<HTMLInputElement | null>(null);
  const incidentTimeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Cargar clientes
    (async () => {
      try {
        const clientsResp = await clientService.getClients({ active: true }, { limit: 100, offset: 0 });
        if (clientsResp && Array.isArray(clientsResp.rows)) {
          setClientes(
            clientsResp.rows.map((c: any) => {
              const fn = c.fullName;
              const first = c.firstName || c.name || "";
              const last = c.lastName || "";
              const company = c.company || "";
              let display = "";
              if (fn) display = fn;
              else if (first || last) display = `${first} ${last}`.trim();
              else if (company) display = company;
              else display = c.name || "Sin nombre";

              return { id: c.id, name: display };
            })
          );
        }
      } catch (e) {
        // silent: dejar el arreglo vacío si falla
        console.error("Error cargando clientes:", e);
      }
    })();

    // NOTA: la carga de `sitios` se hace cuando cambia el `clientId` seleccionado

    // Cargar guardias (securityGuard) — intentamos múltiples endpoints/formatos por compatibilidad
    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId");
        if (!tenantId) return;

        const tryPaths = [
          `/tenant/${tenantId}/securityGuard?limit=100&offset=0`,
          `/tenant/${tenantId}/security-guard?limit=100&offset=0`,
          `/tenant/${tenantId}/securityGuards?limit=100&offset=0`,
          `/tenant/${tenantId}/security-guards?limit=100&offset=0`,
          `/tenant/${tenantId}/user?limit=100&offset=0&role=guard`,
        ];

        let rows: any[] | undefined;
        for (const path of tryPaths) {
          try {
            const resp = await api.get(path, { toast: { silentError: true } } as any);
            const body = resp.data ?? resp; // axios returns { data }
            if (Array.isArray(body)) {
              rows = body;
            } else if (body && Array.isArray(body.rows)) {
              rows = body.rows;
            } else if (body && Array.isArray(body.data)) {
              rows = body.data;
            }
            if (rows && rows.length > 0) break;
          } catch (err) {
            // intentar siguiente path
          }
        }

        if (rows && Array.isArray(rows)) {
          const filtered = rows.filter((g: any) => {
            const gov = g.governmentId ?? g.government_id ?? g.user?.governmentId ?? g.user?.government_id;
            return gov && String(gov).toLowerCase() !== "pending";
          });
          setGuardias(
            filtered.map((g: any) => {
              const display =
                g.fullName ||
                g.displayName ||
                g.name ||
                g.user?.fullName ||
                g.employeeName ||
                ((g.firstName || g.firstname || g.givenName || "") + " " + (g.lastName || g.lastname || g.surname || "")).trim() ||
                g.username ||
                g.email ||
                "Sin nombre";
              return { id: g.id || g.userId || g.guardId || g.uuid, name: display };
            })
          );
        } else {
          // No se encontraron guardias; limpiar
          setGuardias([]);
        }
      } catch (e) {
        console.error("Error cargando guardias:", e);
        setGuardias([]);
      }
    })();

    // Cargar tipos de incidente
    (async () => {
      try {
        const res = await IncidentTypesService.list("", 1, 100);
        if (res && Array.isArray(res.rows)) {
          setTiposIncidente(res.rows.map((t: any) => ({ id: t.id, name: t.name })));
        }
      } catch (e) {
        console.error("Error cargando tipos de incidente:", e);
      }
    })();
  }, []);

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

  // If navigated with a duplicate state, prefill the form
  useEffect(() => {
    try {
      const dup = (location && (location as any).state && (location as any).state.duplicate) || null;
      if (!dup) return;

      const data: any = dup;

      let incidentDate = "";
      let incidentTime = "";
      const dateVal = data.incidentAt || data.dateTime || null;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          incidentDate = d.toISOString().slice(0, 10);
          // format HH:MM
          incidentTime = d.toTimeString().slice(0,5);
        }
      }

      const prefill: any = {
        clientId: data.clientId || data.clientId || "",
        siteId: data.siteId || "",
        guardId: data.guardId || data.guardName || "",
        priority: data.priority || "media",
        callerType: data.callerType || "",
        callerName: data.callerName || "",
        location: data.location || "",
        incidentType: data.incidentTypeId || data.incidentType || "",
        incidentDate,
        incidentTime,
        incidentDetails: data.content || data.incidentDetails || "",
        actionsTaken: data.action || "",
        internalNotes: data.internalNotes || "",
        subject: data.subject || "",
      };

      form.reset(prefill);
      // fill sitios when clientId present (the useEffect watching watchedClientId will load sitios)
    } catch (err) {
      // ignore
    }
  }, [location]);

  // Watch selected clientId and load sitios (postSite) solo para ese cliente
  const watchedClientId = useWatch({ control: form.control, name: "clientId" }) as string | undefined;

  useEffect(() => {
    (async () => {
      try {
        if (!watchedClientId) {
          setSitios([]);
          return;
        }
        const resp = await postSiteService.list({ clientId: watchedClientId }, { limit: 100, offset: 0 });
        if (resp && Array.isArray(resp.rows)) {
          setSitios(resp.rows.map((s: any) => ({ id: s.id, name: s.name || s.companyName || s.address || "Sitio" })));
        } else {
          setSitios([]);
        }
      } catch (e) {
        console.error("Error cargando sitios por cliente:", e);
        setSitios([]);
      }
    })();
  }, [watchedClientId]);

  const onSubmit = async (data: DispatchCreateSchema) => {
    const incidentAt =
      data.incidentDate && data.incidentTime
        ? new Date(`${data.incidentDate}T${data.incidentTime}:00`).toISOString()
        : null;

    // Build explicit payload mapping form fields to backend field names
    const payload: any = {
      clientId: data.clientId || null,
      siteId: data.siteId || null,
      guardId: data.guardId || null,
      priority: data.priority || null,
      // default to 'abierto' when creating a new dispatch
      status: 'abierto',
      callerType: data.callerType || null,
      callerName: data.callerName || null,
      location: data.location || null,
      incidentTypeId: data.incidentType || null,
      incidentAt,
      // Map textual fields to backend expected names
      content: data.incidentDetails || null,
      // `action` on backend is an enum (validated with isIn).
      // Do not send free-form text there to avoid validation errors.
      action: null,
      // Send `actionsTaken` as its own field and keep `internalNotes` separate.
      actionsTaken: data.actionsTaken || null,
      internalNotes: data.internalNotes || null,
      // Derive a subject if not provided
      subject:
        (data as any).subject ||
        `${data.location || ''}${data.incidentDetails ? ' - ' + String(data.incidentDetails).slice(0, 80) : ''}`,
    };

    // Ensure we don't accidentally send File objects
    // (form has `attachment` but attachments are handled separately)
    // Log payload for debugging in DevTools / network
    // eslint-disable-next-line no-console
    console.log('Creating request payload:', payload);

    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        console.error('No tenantId found');
        return;
      }

      // Note: attachments are not uploaded in this flow (option B).
      // Backend controller expects `req.body.data` so wrap payload accordingly
      await api.post(`/tenant/${tenantId}/request`, { data: payload });

      // Show success toast, clear attachments and navigate back
      toast.success('Despacho creado');
      setAttachments([]);
      navigate('/dispatch-tickets');
    } catch (error) {
      console.error('Error creating request:', error);
      try {
        const msg = (error && (error as any).message) || 'Error al crear despacho';
        toast.error(msg);
      } catch (e) {
        toast.error('Error al crear despacho');
      }
    }
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
                    <Select onValueChange={field.onChange} value={field.value} onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => clienteInputRef.current?.focus(), 50);
                      } else {
                        setClienteFilter("");
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-2">
                          <Input
                            ref={(el) => (clienteInputRef.current = el)}
                            placeholder="Buscar cliente..."
                            value={clienteFilter}
                            onChange={(e) => setClienteFilter(e.target.value)}
                          />
                        </div>
                        {clientes
                          .filter((c) => c.name.toLowerCase().includes(clienteFilter.trim().toLowerCase()))
                          .map((c) => (
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
                    <FormLabel>Puesto de seguridad*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => sitioInputRef.current?.focus(), 50);
                      } else {
                        setSitioFilter("");
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-2">
                          <Input
                            ref={(el) => (sitioInputRef.current = el)}
                            placeholder="Buscar sitio..."
                            value={sitioFilter}
                            onChange={(e) => setSitioFilter(e.target.value)}
                          />
                        </div>
                        {sitios
                          .filter((s) => s.name.toLowerCase().includes(sitioFilter.trim().toLowerCase()))
                          .map((s) => (
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
                    <Select onValueChange={field.onChange} value={field.value} onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => guardInputRef.current?.focus(), 50);
                      } else {
                        setGuardFilter("");
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-2">
                          <Input
                            ref={(el) => (guardInputRef.current = el)}
                            placeholder="Buscar guardia..."
                            value={guardFilter}
                            onChange={(e) => setGuardFilter(e.target.value)}
                          />
                        </div>
                        {guardias
                          .filter((g) => g.name.toLowerCase().includes(guardFilter.trim().toLowerCase()))
                          .map((g) => (
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
                    <Select onValueChange={field.onChange} value={field.value} onOpenChange={(open) => {
                      if (open) {
                        setTimeout(() => tipoInputRef.current?.focus(), 50);
                      } else {
                        setTipoFilter("");
                      }
                    }}>
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
                          <div className="px-2 py-2">
                            <Input
                              ref={(el) => (tipoInputRef.current = el)}
                              placeholder="Buscar tipo..."
                              value={tipoFilter}
                              onChange={(e) => setTipoFilter(e.target.value)}
                            />
                          </div>
                          {tiposIncidente
                            .filter((t) => t.name.toLowerCase().includes(tipoFilter.trim().toLowerCase()))
                            .map((t) => (
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
                      <FormItem
                        className="cursor-pointer"
                        onClick={() => {  
                          const el = incidentDateRef.current;
                          if (!el) return;
                          // Prefer showPicker() when available (Chromium), otherwise focus.
                          if (typeof (el as any).showPicker === "function") {
                            try {
                              (el as any).showPicker();
                            } catch (err) {
                              el.focus();
                            }
                          } else {
                            el.focus();
                          }
                        }}
                      >
                        <FormLabel>Fecha del Incidente*</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            ref={(el) => {
                              if (typeof field.ref === "function") field.ref(el);
                              else if (field.ref) (field.ref as any).current = el;
                              incidentDateRef.current = el;
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentTime"
                    render={({ field }) => (
                      <FormItem
                        className="cursor-pointer"
                        onClick={() => {
                          const el = incidentTimeRef.current;
                          if (!el) return;
                          if (typeof (el as any).showPicker === "function") {
                            try {
                              (el as any).showPicker();
                            } catch (err) {
                              el.focus();
                            }
                          } else {
                            el.focus();
                          }
                        }}
                      >
                        <FormLabel>Hora del Incidente*</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            ref={(el) => {
                              if (typeof field.ref === "function") field.ref(el);
                              else if (field.ref) (field.ref as any).current = el;
                              incidentTimeRef.current = el;
                            }}
                          />
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
                    <div className="flex items-start justify-between gap-3">
                      <input
                        ref={fileInputRef}
                        id="dispatch-attachments"
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const input = e.target as HTMLInputElement;
                          const files = Array.from(input.files || []);
                          if (files.length === 0) return;
                          setAttachments((prev) => {
                            const next = [...prev, ...files];
                            try {
                              form.setValue("attachment", next.length ? next[0] : undefined);
                            } catch (err) {
                              /* ignore */
                            }
                            return next;
                          });
                          // reset input so same file can be reselected if needed
                          input.value = "";
                        }}
                      />

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="min-w-[160px]"
                        >
                          Elegir archivos
                        </Button>

                        <div className="flex flex-col gap-1">
                          {attachments.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No hay archivos adjuntos</span>
                          ) : (
                            attachments.map((f, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{f.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttachments((prev) => {
                                      const next = prev.filter((_, i) => i !== idx);
                                      try {
                                        form.setValue("attachment", next.length ? next[0] : undefined);
                                      } catch (err) {
                                        /* ignore */
                                      }
                                      return next;
                                    });
                                  }}
                                  className="text-slate-500 hover:text-red-500"
                                  aria-label={`Eliminar ${f.name}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

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
