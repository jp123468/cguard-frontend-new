"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { newAdminUserSchema, type NewAdminUserValues } from "@/lib/validators/new-admin-user.schema";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Copy, RefreshCcw } from "lucide-react";

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
                {/* Select / Deselect all as first item under the search input */}
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

/* dynamic options loaded from API */
const CLIENT_OPTIONS_PLACEHOLDER: Array<{ id: string; name: string }> = [];

export default function NewAdminUserPage() {
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
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [aclAllowedClientIds, setAclAllowedClientIds] = useState<string[] | null>(null);
  const [aclAllowedPostSiteIds, setAclAllowedPostSiteIds] = useState<string[] | null>(null);
  const prevClientIdsRef = useRef<string[] | undefined>(undefined);
  const params = useParams();
  const editUserId = params.userId;

  // watch selected clients to load sites
  const watchedClientIds = useWatch({ control: form.control, name: 'clientIds' }) as string[] | undefined;
  const watchedPostSiteIds = useWatch({ control: form.control, name: 'postSiteIds' }) as string[] | undefined;

  useEffect(() => {
    // load clients and sites via the tenant endpoints requested
    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;

        // Try to load current user for ACL first
        try {
          const me = await userService.fetchCurrentUser();
          setCurrentUser(me);
        } catch (e) {
          // ignore, we'll try tenant user later if needed
        }

        const clientsResp = await ApiService.get(`/tenant/${tenantId}/client-account`);
        const clientsRows = Array.isArray(clientsResp) ? clientsResp : (clientsResp && clientsResp.rows) ? clientsResp.rows : [];
        const mappedClients = (clientsRows || []).map((c: any) => ({ id: c.id ?? c._id ?? String(c.id), name: c.name ?? c.label ?? c.companyName ?? c.clientName ?? c.clientAccountName ?? '' }));
        setClientOptions(mappedClients);

        const sitesResp = await ApiService.get(`/tenant/${tenantId}/business-info`);
        const sitesRows = Array.isArray(sitesResp) ? sitesResp : (sitesResp && sitesResp.rows) ? sitesResp.rows : [];
        const mappedSites = (sitesRows || []).map((s: any) => ({ id: s.id ?? s._id ?? String(s.id), name: s.companyName ?? s.name ?? s.label ?? '', clientIds: s.clientIds || (s.clientAccountId ? [s.clientAccountId] : []) }));
        setSiteOptions(mappedSites);

        // load roles for access level select
        const res = await ApiService.get(`/tenant/${tenantId}/role`);
        const rows = Array.isArray(res) ? res : (res && res.rows) ? res.rows : [];
        setRoleOptions(rows.map((r: any) => ({ id: r.id ?? r._id ?? String(r.id), name: r.name ?? r.label ?? "" })));

      } catch (err) {
        console.error('Error cargando datos iniciales', err);
      }
    })();
  }, []);

  // load sites whenever selected clients change
  useEffect(() => {
    let mounted = true;
    const prev = prevClientIdsRef.current || [];
    const current = watchedClientIds || [];

    // if no clients selected, clear sites and selected site ids
    if (!current || current.length === 0) {
      setSiteOptions([]);
      setValue('postSiteIds', []);
      prevClientIdsRef.current = current;
      return;
    }

    (async () => {
      try {
        // fetch sites for each selected client and annotate with clientId
        const allWithClient: Array<Array<{ id: string; name: string; clientId: string }>> = await Promise.all(
          current.map(async (cid) => {
            try {
              const res = await postSiteService.list({ clientId: cid }, { limit: 1000, offset: 0 });
              const rows = (res as any).rows || [];
              // defensively filter returned rows by client id fields in case backend ignores the filter
              const filtered = rows.filter((r: any) => {
                // possible client identifiers in backend payload
                const rowClientId = r.client?.id ?? r.clientAccount?.id ?? r.clientAccountId ?? r.clientId ?? null;
                return rowClientId === cid;
              });
              return filtered.map((r: any) => ({ id: r.id, name: r.companyName ?? r.name ?? '', clientId: cid }));
            } catch (e) {
              console.error('Error cargando sitios para cliente', cid, e);
              return [] as Array<{ id: string; name: string; clientId: string }>;
            }
          })
        );

        if (!mounted) return;

        const merged = allWithClient.flat();
        // build map of siteId -> { id, name, clientIds:Set }
        const map = merged.reduce<Record<string, { id: string; name: string; clientIds: Set<string> }>>((acc, cur) => {
          if (!acc[cur.id]) acc[cur.id] = { id: cur.id, name: cur.name, clientIds: new Set<string>() };
          acc[cur.id].clientIds.add(cur.clientId);
          return acc;
        }, {} as Record<string, { id: string; name: string; clientIds: Set<string> }>);

        const uniqueSites = Object.values(map).map((v) => ({ id: v.id, name: v.name, clientIds: Array.from(v.clientIds) }));
        setSiteOptions(uniqueSites);

        // now update selected postSiteIds so they always belong to currently selected clients
        const added = current.filter((c) => !prev.includes(c));
        const currentSelected = (watchedPostSiteIds || []);
        const selectedSet = new Set(currentSelected);

        // for added clients, add their sites
        if (added.length > 0) {
          for (const s of uniqueSites) {
            if (s.clientIds && s.clientIds.some((cid) => added.includes(cid))) selectedSet.add(s.id);
          }
        }

        // ensure final selected sites are subset of available uniqueSites
        const allowedIds = new Set(uniqueSites.map((s) => s.id));
        for (const sid of Array.from(selectedSet)) {
          if (!allowedIds.has(sid)) selectedSet.delete(sid);
        }

        const newSelected = Array.from(selectedSet);
        setValue('postSiteIds', newSelected);

      } catch (err) {
        console.error('Error cargando sitios para clientes seleccionados', err);
        setSiteOptions([]);
      }
    })();

    prevClientIdsRef.current = current;

    return () => { mounted = false; };
  }, [watchedClientIds]);

  // ACL: Filter available options for non-admins
  useEffect(() => {
    (async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;

        let me = currentUser;
        if (!me) {
          try {
            me = await ApiService.get(`/auth/me`);
            setCurrentUser(me);
          } catch (e) {
            // fallback
          }
        }

        let tenantUser = null;
        if (me && me.tenants) {
          tenantUser = Array.isArray(me.tenants) ? me.tenants.find((t: any) => (t.tenant?.id ?? t.tenantId ?? t.tenant) === tenantId) : null;
        }

        if (!tenantUser) {
          // attempt tenant user endpoint (may return assignedClients)
          try {
            const curId = me?.id || me?._id || null;
            if (curId) {
              const tu = await userService.fetchUser(curId);
              tenantUser = tu;
            }
          } catch (e) {
            // ignore
          }
        }

        const roles = tenantUser?.roles || tenantUser?.role || [];
        const isAdmin = Array.isArray(roles) ? roles.includes('admin') || roles.includes('Admin') : String(roles).toLowerCase().includes('admin');

        if (isAdmin) {
          setAclAllowedClientIds(null);
          setAclAllowedPostSiteIds(null);
          return;
        }

        // if not admin, restrict to assigned arrays
        const assignedClients = tenantUser?.assignedClients || tenantUser?.clientIds || [];
        const assignedSites = tenantUser?.assignedPostSites || tenantUser?.postSiteIds || [];
        setAclAllowedClientIds(Array.isArray(assignedClients) ? assignedClients : []);
        setAclAllowedPostSiteIds(Array.isArray(assignedSites) ? assignedSites : []);

        // filter clientOptions and siteOptions accordingly
        if (assignedClients && Array.isArray(assignedClients) && assignedClients.length > 0) {
          setClientOptions((prev) => prev.filter((c) => assignedClients.includes(c.id)));
        }
        if (assignedSites && Array.isArray(assignedSites) && assignedSites.length > 0) {
          setSiteOptions((prev) => prev.filter((s) => assignedSites.includes(s.id)));
        }

      } catch (e) {
        console.error('Error evaluando ACL', e);
      }
    })();
  }, [currentUser]);

  // If editing an existing user, fetch and prefill
  useEffect(() => {
    if (!editUserId) return;
    (async () => {
      setLoading(true);
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) throw new Error('Tenant no configurado');
        const resp = await userService.fetchUser(editUserId);
        // resp may include tenants array, search by tenant
        const tenantObj = resp?.tenants ? resp.tenants.find((t: any) => (t.tenant?.id ?? t.tenantId ?? t.tenant) === tenantId) : null;
        const assignedClients = tenantObj?.assignedClients || resp?.assignedClients || tenantObj?.clientIds || resp?.clientIds || [];
        const assignedSites = tenantObj?.assignedPostSites || resp?.assignedPostSites || tenantObj?.postSiteIds || resp?.postSiteIds || [];

        if (resp?.name) setValue('name', resp.name);
        if (resp?.email) setValue('email', resp.email);
        if (resp?.role) setValue('accessLevel', resp.role);
        if (Array.isArray(assignedClients)) setValue('clientIds', assignedClients);
        if (Array.isArray(assignedSites)) setValue('postSiteIds', assignedSites);
      } catch (e) {
        console.error('Error cargando usuario para edición', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [editUserId]);

  const navigate = useNavigate();

  // Invitation modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<string | null>(null);

  const onSubmit = async (values: NewAdminUserValues) => {
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant ID no configurado");

      // local validation for UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidClient = (values.clientIds || []).find((id) => !uuidRegex.test(id));
      const invalidSite = (values.postSiteIds || []).find((id) => !uuidRegex.test(id));
      if (invalidClient || invalidSite) {
        toast.error('IDs inválidos detectados en asignaciones');
        return;
      }

      const invitedPending = true; // user hasn't signed in yet
      const payload = {
        name: values.name,
        email: values.email,
        role: values.accessLevel,
        clientIds: values.clientIds,
        postSiteIds: values.postSiteIds || [],
        invited: invitedPending,
        pending: invitedPending,
      } as any;

      console.log("[NewAdminUserPage] tenantId ->", tenantId);
      console.log("[NewAdminUserPage] creating user payload ->", payload);

      let resp: any;
      if (editUserId) {
        resp = await userService.updateUser(editUserId, payload);
      } else {
        resp = await userService.createUser(payload);
      }

      console.log("[NewAdminUserPage] response ->", resp);
      toast.success(editUserId ? "Usuario actualizado correctamente" : "Usuario creado correctamente");
      navigate("/back-office");
    } catch (err) {
      const e = err as any;
      // use helper to map backend validation errors to form fields
      try {
        // lazy import to avoid cycles
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else {
          const backendErrors = e?.response?.data?.errors || e?.response?.data?.user?.errors || e?.response?.data || null;
          if (backendErrors?.message) toast.error(backendErrors.message);
          else toast.error(e?.message || 'Error desconocido');
        }
      } catch (ex) {
        const msg = e?.message || e?.toString() || "Error desconocido";
        toast.error(`${msg}`);
      }
    }
  };

  const createInvitationToken = async () => {
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant ID no configurado");
      setInviteLoading(true);
      setGeneratedToken(null);

      // Try backend endpoint; fallback to local token generation
      // Try backend endpoint first; if it fails, fallback to local 6-digit token
      try {
        const payload = { email: inviteEmail || undefined, expiresInSeconds: 3600 };
        const resp: any = await ApiService.post(`/tenant/${tenantId}/tenant-user/invitation-token`, payload);
        const token = resp?.token || resp?.invitationToken || resp?.data?.token || resp?.data?.invitationToken;
        const expiresAt = resp?.expiresAt || resp?.invitationTokenExpiresAt || resp?.data?.expiresAt || null;
        if (token) {
          setGeneratedToken(String(token));
          setGeneratedExpiresAt(expiresAt ? String(expiresAt) : new Date(Date.now() + 3600 * 1000).toISOString());
          toast.success("Código de invitación creado");
          return;
        }
        throw new Error("No token in response");
      } catch (e) {
        // fallback: generate a local 6-digit numeric token
        const token = generateNumericCode(6);
        setGeneratedToken(token);
        setGeneratedExpiresAt(new Date(Date.now() + 3600 * 1000).toISOString());
        toast.success("Código generado localmente (no guardado en servidor)");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error creando código");
    } finally {
      setInviteLoading(false);
    }
  };

  const generateRandomToken = (length = 48) => {
    try {
      const array = new Uint8Array(length / 2);
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      // ignore
    }
    // fallback simple random
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const generateNumericCode = (digits = 6) => {
    const max = Math.pow(10, digits);
    const num = Math.floor(Math.random() * max);
    return String(num).padStart(digits, '0');
  };

  const regenCode = async () => {
    // regenerate locally first for instant UX; also attempt backend if available
    setGeneratedToken(generateNumericCode(6));
    setGeneratedExpiresAt(new Date(Date.now() + 3600 * 1000).toISOString());
    try {
      await createInvitationToken();
    } catch (e) {
      // ignore — createInvitationToken handles errors
    }
  };

  // Auto-generate when modal opens (call backend)
  useEffect(() => {
    if (inviteOpen && !generatedToken) {
      // fire and forget
      createInvitationToken();
    }
  }, [inviteOpen]);

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
                    <FormLabel>Asignar Clientes</FormLabel>
                    <FormControl>
                      <ClientMultiSelect
                        value={(field.value as string[]) || []}
                        onChange={(ids: string[]) => field.onChange(ids)}
                        options={clientOptions}
                        placeholder="Asignar Clientes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fila 3 (col-span-2) */}
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
            <div className="flex justify-between items-center">
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="border border-orange-500 text-orange-500 bg-transparent hover:bg-orange-50 hover:text-orange-600 hover:border-orange-600 transition duration-200 px-4 py-2 rounded-md" variant="outline">Crear código de invitación</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="textalign-center ">Generar código de invitación</DialogTitle>
                    <DialogDescription>
                      Cree un código temporal para invitar a un usuario (expira en 1 hora).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="border-2 border-dashed border-muted px-6 py-3 rounded text-2xl font-mono tracking-wider">
                          {generatedToken || '------'}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button type="button" variant="ghost" onClick={async () => { if (generatedToken) { await navigator.clipboard.writeText(generatedToken); toast.success('Código copiado'); } }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {generatedExpiresAt && <div className="text-xs text-muted-foreground mt-1">Expira: {generatedExpiresAt}</div>}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={createInvitationToken} disabled={inviteLoading}>{inviteLoading ? 'Generando...' : (generatedToken ? 'Regenerar' : 'Generar código')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button className="bg-orange-500 text-white hover:bg-orange-600" type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
