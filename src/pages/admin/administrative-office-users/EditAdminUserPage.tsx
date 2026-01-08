"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef } from "react";

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
import { ApiService } from "@/services/api/apiService";
import userService from "@/lib/api/userService";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { newAdminUserSchema, type NewAdminUserValues } from "@/lib/validators/new-admin-user.schema";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

function ClientMultiSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const picked = options.filter((o) => value.includes(o.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {picked.length ? (
            <span className="truncate">{picked.map((p) => p.name).join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder || "Seleccionar…"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[360px]">
        <div className="p-2">
          <Command>
            <CommandInput placeholder={`Buscar ${placeholder || "opción"}…`} />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    const allSelected = options.length > 0 && value.length === options.length && options.every((o) => value.includes(o.id));
                    if (allSelected) onChange([]);
                    else onChange(options.map((o) => o.id));
                  }}
                >
                  {
                    (() => {
                      const allSelected = options.length > 0 && value.length === options.length && options.every((o) => value.includes(o.id));
                      return (
                        <>
                          <input className="mr-2" type="checkbox" readOnly checked={allSelected} />
                          {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </>
                      );
                    })()
                  }
                </CommandItem>

                {options.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">Sin opciones</div>
                )}

                {options.map((opt) => {
                  const checked = value.includes(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      onSelect={() => {
                        if (checked) onChange(value.filter((id) => id !== opt.id));
                        else onChange([...value, opt.id]);
                      }}
                    >
                      <input className="mr-2" type="checkbox" readOnly checked={checked} />
                      {opt.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const CLIENT_OPTIONS_PLACEHOLDER: Array<{ id: string; name: string }> = [];

export default function EditAdminUserPage() {
  const params = useParams();
  const id = params.id;

  const form = useForm<NewAdminUserValues>({
    resolver: zodResolver(newAdminUserSchema),
    defaultValues: {
      name: "",
      email: "",
      accessLevel: undefined as unknown as NewAdminUserValues["accessLevel"],
      clientIds: [],
      postSiteIds: [],
    },
    mode: "onTouched",
  });

  const { handleSubmit, control, formState, setValue, setError } = form;
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string }>>(CLIENT_OPTIONS_PLACEHOLDER);
  const [siteOptions, setSiteOptions] = useState<Array<{ id: string; name: string; clientIds?: string[] }>>([]);
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name?: string; label?: string }>>([]);
  const [fetchedRoleCandidate, setFetchedRoleCandidate] = useState<any>(null);
  const prevClientIdsRef = useRef<string[] | undefined>(undefined);

  const watchedClientIds = useWatch({ control: form.control, name: 'clientIds' }) as string[] | undefined;
  const watchedPostSiteIds = useWatch({ control: form.control, name: 'postSiteIds' }) as string[] | undefined;

  useEffect(() => {
    (async () => {
      try {
        const clients = await clientService.getClients({});
        setClientOptions((clients as any).rows || []);
      } catch (err) {
        setClientOptions([]);
      }
    })();

    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;
        const res = await ApiService.get(`/tenant/${tenantId}/role`);
        const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
        const opts = rows.map((r: any) => ({ id: r.id ?? r._id ?? String(r.id), name: r.name ?? r.label ?? "" }));
        setRoleOptions(opts);
      } catch (e) {
        setRoleOptions([]);
      }
    })();
  }, []);

  // try to resolve a fetched simple role candidate once roleOptions are available
  useEffect(() => {
    if (!fetchedRoleCandidate || roleOptions.length === 0) return;
    const candidate = fetchedRoleCandidate;

    const normalize = (s: any) => {
      if (!s && s !== 0) return '';
      try {
        return String(s)
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .replace(/[_\-\s]+/g, '');
      } catch (e) {
        return String(s).toLowerCase();
      }
    };

    const candNorm = normalize(typeof candidate === 'object' ? (candidate.name ?? candidate.role ?? candidate) : candidate);

    const found = roleOptions.find((o) => {
      if (!o) return false;
      const nameNorm = normalize(o.name ?? o.label ?? o.id);
      // exact id match
      if (o.id === candidate) return true;
      // exact normalized match
      if (candNorm && (nameNorm === candNorm)) return true;
      // contains or partial match (e.g., 'gerente-general' vs 'Gerente General')
      if (candNorm && nameNorm.includes(candNorm)) return true;
      if (candNorm && candNorm.includes(nameNorm)) return true;
      return false;
    });

    if (found) setValue('accessLevel', String(found.id));
    setFetchedRoleCandidate(null);
  }, [fetchedRoleCandidate, roleOptions, setValue]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;
        const res = await userService.fetchUser(id as string);
        const user = res?.data || res || null;
        if (!user) return;

        // map backend user to form fields as best-effort
        setValue('name', user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || '');
        setValue('email', user.email || '');
        // Try to resolve accessLevel from several shapes, prefer tenant-scoped roles
        let roleCandidate: any = null;
        try {
          const tenantId = localStorage.getItem('tenantId');
          if (Array.isArray(user.tenants) && user.tenants.length > 0) {
            const tenantEntry = tenantId ? user.tenants.find((t: any) => (t.tenantId === tenantId) || (t.tenant && (t.tenant.id === tenantId || t.tenant.tenantId === tenantId))) : user.tenants[0];
            if (tenantEntry) {
              // tenantEntry.roles might be array or single value
              if (Array.isArray(tenantEntry.roles) && tenantEntry.roles.length > 0) roleCandidate = tenantEntry.roles[0];
              else if (tenantEntry.role) roleCandidate = tenantEntry.role;
            }
          }
        } catch (e) {
          // ignore and fallback below
        }
        if (!roleCandidate) {
          roleCandidate = user.role || (Array.isArray(user.roles) && user.roles[0]) || user.roles?.[0];
        }
        // if candidate is an object with id, use it; otherwise keep candidate to resolve after roleOptions load
        const roleId = roleCandidate && (roleCandidate.id ?? roleCandidate._id ?? null);
        if (roleId) {
          setValue('accessLevel', String(roleId));
        } else if (roleCandidate) {
          // store simple candidate (e.g. "supervisor") to resolve once role options are loaded
          setFetchedRoleCandidate(roleCandidate);
        }

        // clients and post sites (backend may return different property names)
        const clientSource = user.clientIds ?? user.clients ?? user.assignedClients ?? [];
        const clientIds = Array.isArray(clientSource) ? clientSource.map((c: any) => (c && (c.id || c)) || c).filter(Boolean) : [];

        const postSiteSource = user.postSiteIds ?? user.postSites ?? user.assignedPostSites ?? [];
        const postSiteIds = Array.isArray(postSiteSource) ? postSiteSource.map((p: any) => (p && (p.id || p)) || p).filter(Boolean) : [];
        if (clientIds && clientIds.length) setValue('clientIds', clientIds);
        if (postSiteIds && postSiteIds.length) setValue('postSiteIds', postSiteIds);
      } catch (err) {
        toast.error('No se pudo cargar la información del usuario');
      }
    })();
  }, [id, setValue]);

  useEffect(() => {
    let mounted = true;
    const prev = prevClientIdsRef.current || [];
    const current = watchedClientIds || [];

    if (!current || current.length === 0) {
      setSiteOptions([]);
      setValue('postSiteIds', []);
      prevClientIdsRef.current = current;
      return;
    }

    (async () => {
      try {
        const allWithClient: Array<Array<{ id: string; name: string; clientId: string }>> = await Promise.all(
          current.map(async (cid) => {
            try {
              const res = await postSiteService.list({ clientId: cid }, { limit: 1000, offset: 0 });
              const rows = (res as any).rows || [];
              const filtered = rows.filter((r: any) => {
                const rowClientId = r.client?.id ?? r.clientAccount?.id ?? r.clientAccountId ?? r.clientId ?? null;
                return rowClientId === cid;
              });
              return filtered.map((r: any) => ({ id: r.id, name: r.companyName ?? r.name ?? '', clientId: cid }));
            } catch (e) {
              return [] as Array<{ id: string; name: string; clientId: string }>;
            }
          })
        );

        if (!mounted) return;

        const merged = allWithClient.flat();
        const map = merged.reduce<Record<string, { id: string; name: string; clientIds: Set<string> }>>((acc, cur) => {
          if (!acc[cur.id]) acc[cur.id] = { id: cur.id, name: cur.name, clientIds: new Set<string>() };
          acc[cur.id].clientIds.add(cur.clientId);
          return acc;
        }, {} as Record<string, { id: string; name: string; clientIds: Set<string> }>);

        const uniqueSites = Object.values(map).map((v) => ({ id: v.id, name: v.name, clientIds: Array.from(v.clientIds) }));
        setSiteOptions(uniqueSites);

        const added = current.filter((c) => !prev.includes(c));
        const currentSelected = (watchedPostSiteIds || []);
        const selectedSet = new Set(currentSelected);

        if (added.length > 0) {
          for (const s of uniqueSites) {
            if (s.clientIds && s.clientIds.some((cid) => added.includes(cid))) selectedSet.add(s.id);
          }
        }

        const allowedIds = new Set(uniqueSites.map((s) => s.id));
        for (const sid of Array.from(selectedSet)) {
          if (!allowedIds.has(sid)) selectedSet.delete(sid);
        }

        const newSelected = Array.from(selectedSet);
        setValue('postSiteIds', newSelected);

      } catch (err) {
        setSiteOptions([]);
      }
    })();

    prevClientIdsRef.current = current;

    return () => { mounted = false; };
  }, [watchedClientIds]);

  const navigate = useNavigate();

  const onSubmit = async (values: NewAdminUserValues) => {
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant ID no configurado");

      const payload = {
        name: values.name,
        email: values.email,
        role: values.accessLevel,
        clientIds: values.clientIds,
        postSiteIds: values.postSiteIds || [],
      } as any;
      if (id) {
        // prefer PUT
        try {
          await userService.updateUser(id, payload);
        } catch (e: any) {
          const status = e?.response?.status;
          // Only fallback to create if the user was not found (legacy behavior)
          if (status === 404) {
            await userService.createUser({ ...payload, id } as any);
          } else {
            // rethrow to be handled by outer catch which maps validation errors
            throw e;
          }
        }
        toast.success("Usuario actualizado correctamente");
      } else {
        await userService.createUser({ ...payload, invited: true, pending: true } as any);
        toast.success("Usuario creado correctamente");
      }

      navigate("/back-office");
    } catch (err: any) {
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(err, setError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else {
          const msg = err?.response?.data?.message || err?.message || (typeof err === 'string' ? err : 'Error desconocido');
          toast.error(`${msg}`);
        }
      } catch (ex) {
        const msg = err?.response?.data?.message || err?.message || (typeof err === 'string' ? err : 'Error desconocido');
        toast.error(`${msg}`);
      }
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: id ? "Editar Usuario" : "Nuevo Usuario" },
        ]}
      />

      <div className="p-4">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
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
                        {roleOptions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
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
                name="clientIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar Clientes*</FormLabel>
                    <FormControl>
                      <ClientMultiSelect
                        value={(field.value as string[]) || []}
                        onChange={(ids: string[]) => field.onChange(ids)}
                        options={clientOptions}
                        placeholder="Asignar Clientes*"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <FormField
                control={control}
                name="postSiteIds"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Asignar Sitios de Publicación</FormLabel>
                    <FormControl>
                      <ClientMultiSelect
                        value={(field.value as string[]) || []}
                        onChange={(ids: string[]) => field.onChange(ids)}
                        options={siteOptions}
                        placeholder="Asignar Sitios de Publicación"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? (id ? "Guardando..." : "Enviando...") : (id ? "Guardar" : "Enviar")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
