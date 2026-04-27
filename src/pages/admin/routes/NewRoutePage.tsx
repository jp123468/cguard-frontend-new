import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { useWatch } from "react-hook-form";
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
import { toast } from 'sonner';
import telemetryService from '@/lib/api/telemetryService';
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

import userService from "@/lib/api/userService";
import { postSiteService } from "@/lib/api/postSiteService";
import vehicleService from "@/lib/api/vehicleService";
import routeService from "@/lib/api/routeService";

// When backend fails, we must not show fallback data — keep vehicles empty.

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
  const params = useParams<{ tenantId?: string }>();
  const navigate = useNavigate();

  // If tenantId present in URL, persist to localStorage so services pick it up
  useEffect(() => {
    try {
      if (params && params.tenantId) {
        localStorage.setItem('tenantId', params.tenantId);
      }
    } catch (e) {
      // ignore
    }
  }, [params]);
  const parseCoord = (v: any): number | null => {
    if (v == null) return null;
    if (typeof v === 'number') {
      if (Number.isFinite(v)) return v;
      return null;
    }
    let s = String(v).trim();
    // replace comma decimal separators
    s = s.replace(/,/g, '.');
    // remove non-numeric trailing chars
    const m = s.match(/-?[0-9]+\.?[0-9]*/);
    if (!m) return null;
    const num = Number(m[0]);
    if (!Number.isFinite(num)) return null;
    return num;
  };
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
      supervisorId: "",
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

  const watchedDays = useWatch({ control: form.control, name: 'days' as any }) as string[] | undefined;

  const daysText = useMemo(() => {
    const d = watchedDays ?? [];
    if (!d.length) return ", , , , , ,";
    return d.map((k: any) => DAY_LABEL[k]).join(", ");
  }, [watchedDays]);

  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; address?: string; lat?: number | string; lng?: number | string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; name: string; licensePlate?: string }[]>([]);
  const [points, setPoints] = useState<Array<{
    siteId: string;
    siteName?: string;
    address?: string;
    duration: number;
    scheduledHits: number;
    lat?: number | null;
    lng?: number | null;
  }>>([]);
  const [pointOrder, setPointOrder] = useState<string | ''>('');

  useEffect(() => {
    let mounted = true;

    // Load supervisors: only active users with supervisor role
    (async () => {
      try {
        const res: any[] = await userService.listUsers({ active: true, limit: 200, offset: 0 });
        if (!mounted) return;

        const normalizeRoles = (rolesValue: any): string[] => {
          if (!rolesValue) return [];
          if (Array.isArray(rolesValue)) {
            return rolesValue
              .map((item) => (typeof item === 'string' ? item : item && (item.name || item.role) ? item.name || item.role : ''))
              .filter(Boolean)
              .map((item) => String(item).toLowerCase().trim());
          }
          if (typeof rolesValue === 'string') {
            return [rolesValue.toLowerCase().trim()];
          }
          if (typeof rolesValue === 'object') {
            const candidate = rolesValue.name || rolesValue.role || rolesValue.type || '';
            return candidate ? [String(candidate).toLowerCase().trim()] : [];
          }
          return [];
        };

        const normalizedTargets = ['supervisor', 'securitysupervisor', 'admin'];

        const isUserActive = (u: any) => {
          if (!u) return false;
          const truthyFlag = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
          const hasTruthy = truthyFlag(u.active) || truthyFlag(u.isActive) || truthyFlag(u.enabled);
          const st = (u.status || u.state || u.accountStatus || '').toString().toLowerCase().trim();
          const pendingPatterns = ['pend', 'pendiente', 'pending', 'inactive', 'inactivo', 'disabled'];
          const isPending = pendingPatterns.some((p) => st.includes(p));
          if (hasTruthy && !isPending) return true;
          if (['active', 'activo', 'enabled', 'habilitado'].includes(st)) return true;
          return false;
        };

        const filtered = (res || []).filter((u: any) => {
          const userRoles = normalizeRoles(u.roles || u.role || u.rolesList || u._rolesDisplay);
          const isSupervisor = userRoles.some((r) => normalizedTargets.some(target => r.includes(target)));
          if (!isSupervisor) return false;
          return isUserActive(u);
        });

        setSupervisors(
          filtered.map((u: any) => ({
            id: u.id,
            name: u.displayName || (u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : undefined) || u.name || u.email || String(u.id),
          }))
        );
      } catch (e) {
        console.error('Error loading supervisors', e);
        try { toast.error(String((e as any)?.message || (e as any)?.toString() || 'Error cargando supervisores')); } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error cargando supervisores', details: e }); } catch {}
      }
    })();

    // Load publish sites
    (async () => {
      try {
        const res: any = await postSiteService.list({}, { limit: 100, offset: 0 });
        const rows = res && res.rows ? res.rows : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        setSites(rows.map((s: any) => {
          const rawLat = s.latitud ?? s.latitude ?? s.lat ?? s.locationLat ?? undefined;
          const rawLng = s.longitud ?? s.longitude ?? s.lng ?? s.locationLng ?? undefined;
          let lat = parseCoord(rawLat);
          let lng = parseCoord(rawLng);
          // detect swapped coordinates (lat out of -90..90 but lng looks like a valid lat)
          const latValid = lat != null && lat >= -90 && lat <= 90;
          const lngValid = lng != null && lng >= -180 && lng <= 180;
          if ((!latValid && lng != null && lng >= -90 && lng <= 90) && (lat != null && (lat >= -180 && lat <= 180))) {
            // swap
            const tmp = lat;
            lat = lng;
            lng = tmp;
          }
          return { id: s.id, name: s.name, address: s.address || s.location || s.postalAddress || '', lat, lng };
        }));
      } catch (e) {
        console.error('Error loading sites', e);
        try { toast.error(String((e as any)?.message || (e as any)?.toString() || 'Error cargando Puestos de Vigilancia')); } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error cargando Puestos de Vigilancia', details: e }); } catch {}
      }
    })();

    // Load vehicles (if backend endpoint exists)
    (async () => {
      try {
        const res: any = await vehicleService.list({ limit: 100 });
        const rows = res && res.rows ? res.rows : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        const mapped = rows.length
          ? rows.map((v: any) => ({
              id: v.id,
              name: v.name || '',
              licensePlate: v.licensePlate || '',
            }))
          : [];
        setVehicles(mapped);
      } catch (e) {
        // Determine if error is due to missing vehicles table. If so,
        // keep the dropdown empty and avoid showing fallback items
        console.warn('vehicleService.list failed', e);
        const rawMsg = String((e as any)?.message || (e as any)?.toString() || '');
        const isTableMissing = /table.+vehicles.+doesn'?t exist/i.test(rawMsg) || /does not exist/i.test(rawMsg) || /vehicles'.*doesn?t exist/i.test(rawMsg);
        // On any error, clear vehicles — do not use fallback data
        setVehicles([]);
        try { toast.error(String((e as any)?.message || (e as any)?.toString() || 'Error cargando vehículos')); } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error cargando vehículos', details: e }); } catch {}
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sync points with selected siteIds: keep order from form.siteIds
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'siteIds') {
        const selected = (value.siteIds || []) as string[];
        setPoints((prev) => {
          // keep existing for unchanged ids
          const byId = new Map(prev.map((p) => [p.siteId, p]));
          const next = selected.map((id: string) => {
            const existing = byId.get(id);
            const site = sites.find((s) => s.id === id);
            const latRaw = site?.lat ?? existing?.lat ?? null;
            const lngRaw = site?.lng ?? existing?.lng ?? null;
            const lat = latRaw == null ? null : Number(latRaw);
            const lng = lngRaw == null ? null : Number(lngRaw);
            return {
              siteId: id,
              siteName: site?.name || existing?.siteName,
              address: site?.address || existing?.address || '',
              duration: existing?.duration ?? 5,
              scheduledHits: existing?.scheduledHits ?? 1,
              lat,
              lng,
            };
          });
          return next;
        });
      }
    });
    return () => subscription.unsubscribe && subscription.unsubscribe();
  }, [form, sites]);

  const movePoint = (index: number, dir: number) => {
    setPoints((prev) => {
      const arr = prev.slice();
      const to = index + dir;
      if (to < 0 || to >= arr.length) return arr;
      const tmp = arr[to];
      arr[to] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  };

  const removePoint = (siteId: string) => {
    // also remove from form.siteIds
    const cur = form.getValues('siteIds') || [];
    form.setValue('siteIds', (cur as string[]).filter((x) => x !== siteId));
    setPoints((prev) => prev.filter((p) => p.siteId !== siteId));
  };

  const updatePointField = (siteId: string, field: 'duration' | 'scheduledHits' | 'address', value: any) => {
    setPoints((prev) => prev.map((p) => (p.siteId === siteId ? { ...p, [field]: value } : p)));
  };

  const onSubmit = (data: RouteCreateSchema) => {
    (async () => {
      try {
        setSubmitting(true);
        const payload = {
          ...data,
          assignedGuard: data.supervisorId, // backend expects assignedGuard
          windowStart:
            data.dateFrom && data.startTime
              ? new Date(`${data.dateFrom}T${data.startTime}:00`).toISOString()
              : null,
          windowEnd:
            data.dateTo && data.endTime
              ? new Date(`${data.dateTo}T${data.endTime}:00`).toISOString()
              : null,
          points: points.map((p, idx) => ({
            siteId: p.siteId,
            order: idx + 1,
            duration: p.duration,
            scheduledHits: p.scheduledHits,
            address: p.address,
          })),
        } as any;

        const resp = await routeService.create(payload);
        // show success, then navigate back to the routes list
        console.log('Ruta creada:', resp);
        toast.success('Ruta creada');
        try {
          const path = '/vehicle-patrol/routes';
          navigate(path, { replace: true });
        } catch (e) {
          // ignore navigation errors
        }
      } catch (err: any) {
        console.error('Error creando ruta', err);
        try {
          const msg = err?.message || err?.toString() || (err?.details && JSON.stringify(err.details)) || 'Error creando ruta';
          toast.error(String(msg));
        } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error creando ruta', details: err }); } catch {}
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const [submitting, setSubmitting] = useState(false);

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

            {/* Filtro de Guardia eliminado según solicitud */}

            <FormField
              control={form.control}
              name="supervisorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar Supervisor*</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((s) => (
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
              name="siteIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seleccionar Puestos de Vigilancia*</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
                      >
                        <span className="truncate">
                          {(field.value || []).length
                            ? (field.value || [])
                                .map((id: string) => sites.find((s) => s.id === id)?.name)
                                .filter((n): n is string => Boolean(n))
                                .join(', ')
                            : 'Seleccionar'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[320px]">
                      {sites.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No hay puestos disponibles</div>
                      ) : (
                        sites.map((s) => {
                          const checked = (field.value || []).includes(s.id);
                          return (
                            <DropdownMenuCheckboxItem
                              key={s.id}
                              checked={checked}
                              onCheckedChange={(v) => {
                                const cur = new Set(field.value || []);
                                if (v) cur.add(s.id);
                                else cur.delete(s.id);
                                field.onChange(Array.from(cur));
                              }}
                            >
                              {s.name}
                            </DropdownMenuCheckboxItem>
                          );
                        })
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="text-sm font-semibold">Definir ruta</div>
              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="text-sm font-medium">Puntos y tiempos</div>
                  {/* Dropdown de orden deshabilitado temporalmente
                  <Select value={pointOrder} onValueChange={(v) => {
                    setPointOrder(v);
                    if (v === 'aleatorio') {
                      // shuffle points
                      setPoints((prev) => {
                        const a = prev.slice();
                        for (let i = a.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          const tmp = a[i];
                          a[i] = a[j];
                          a[j] = tmp;
                        }
                        form.setValue('siteIds', a.map(p => p.siteId));
                        return a;
                      });
                    } else if (v === 'distancia') {
                      // order points by distance using lat/lng via greedy nearest-neighbor
                      // (temporarily disabled)
                    }
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Seleccionar">{pointOrder === 'distancia' ? 'Ordenar según la distancia' : pointOrder === 'aleatorio' ? 'Ordenar de manera aleatoria' : undefined}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distancia">Ordenar según la distancia</SelectItem>
                      <SelectItem value="aleatorio">Ordenar de manera aleatoria</SelectItem>
                    </SelectContent>
                  </Select>
                  */}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Puesto de seguridad</th>
                        <th className="px-4 py-3 font-semibold">Dirección</th>
                        <th className="px-4 py-3 font-semibold">Pasadas</th>
                        <th className="px-4 py-3 font-semibold">Duración (min)</th>
                        <th className="px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            No hay puntos definidos
                          </td>
                        </tr>
                      ) : (
                        points.map((p, idx) => (
                          <tr key={p.siteId} className="border-b">
                            <td className="px-4 py-3">{idx + 1}</td>
                            <td className="px-4 py-3">{p.siteName || p.siteId}</td>
                            <td className="px-4 py-3">{p.address || <span className="text-muted-foreground">-</span>}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                value={p.scheduledHits}
                                onChange={(e) => updatePointField(p.siteId, 'scheduledHits', Number(e.target.value || 0))}
                                className="w-20 rounded border px-2 py-1"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                value={p.duration}
                                onChange={(e) => updatePointField(p.siteId, 'duration', Number(e.target.value || 0))}
                                className="w-24 rounded border px-2 py-1"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => movePoint(idx, -1)} className="rounded border px-2 py-1">↑</button>
                                <button type="button" onClick={() => movePoint(idx, 1)} className="rounded border px-2 py-1">↓</button>
                                <button type="button" onClick={() => removePoint(p.siteId)} className="rounded border px-2 py-1 text-red-600">Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
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
                      <SelectValue placeholder="Seleccionar vehículo">
                        {(() => {
                          const sv = vehicles.find((x) => x.id === field.value);
                          return sv ? `${sv.name}${sv.licensePlate ? ' • ' + sv.licensePlate : ''}` : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="truncate">{[v.name, v.licensePlate].filter(Boolean).join(' • ')}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
                {/* Patrols are created by default; UI option removed */}
              <FormField
                control={form.control}
                name="syncHitsBetweenGuards"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox id="syncHits" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="syncHits" className="cursor-pointer">
                      Sincronizar pasadas entre guardias
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
                      Enviar notificación antes de las pasadas programadas
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
                      Registro automático de entrada y salida en Puestos de Vigilancia según geocerca
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
                <Link to="/vehicle-patrol/routes">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={submitting || form.formState.isSubmitting}
              >
                {submitting ? 'Enviando...' : 'Enviar'}
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
