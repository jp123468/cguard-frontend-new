import { useEffect, useMemo, useState } from "react";
import { useWatch, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routeCreateSchema, type RouteCreateSchema } from "@/lib/validators/route-create.schema";
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
import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import userService from "@/lib/api/userService";
import { postSiteService } from "@/lib/api/postSiteService";
import vehicleService from "@/lib/api/vehicleService";
import routeService from "@/lib/api/routeService";

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

type RouteFormProps = {
  mode: "create" | "edit";
  routeId?: string;
  initialData?: Partial<RouteCreateSchema> & {
    supervisorId?: string;
    supervisorName?: string;
    siteIds?: string[];
    vehicleId?: string;
    vehicleName?: string;
    vehicleLicensePlate?: string;
    points?: Array<{
      siteId: string;
      siteName?: string;
      address?: string;
      duration?: number;
      scheduledHits?: number;
      lat?: number | null;
      lng?: number | null;
    }>;
  };
  onSuccess?: () => void;
};

const parseCoord = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (Number.isFinite(v)) return v;
    return null;
  }
  let s = String(v).trim();
  s = s.replace(/,/g, '.');
  const m = s.match(/-?[0-9]+\.?[0-9]*/);
  if (!m) return null;
  const num = Number(m[0]);
  if (!Number.isFinite(num)) return null;
  return num;
};

export default function RouteForm({ mode, routeId, initialData, onSuccess }: RouteFormProps) {
  const initialSupervisorId = initialData?.supervisorId ?? (initialData as any)?.assignedGuard ?? '';
  const initialSupervisorName = initialData?.supervisorName ?? (initialData as any)?.assignedGuardName ?? '';
  const form = useForm<RouteCreateSchema>({
    resolver: zodResolver(routeCreateSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      continuous: initialData?.continuous ?? true,
      dateFrom: initialData?.dateFrom || "",
      dateTo: initialData?.dateTo || "",
      startTime: initialData?.startTime || "00:00",
      endTime: initialData?.endTime || "23:59",
      days: initialData?.days || [],
      supervisorId: initialSupervisorId ? String(initialSupervisorId) : "",
      siteIds: initialData?.siteIds || [],
      vehicleId: initialData?.vehicleId ? String(initialData?.vehicleId) : "",
      syncHitsBetweenGuards: initialData?.syncHitsBetweenGuards || false,
      forceVehicleRouteOrder: initialData?.forceVehicleRouteOrder || false,
      notifyBefore: initialData?.notifyBefore || "00:15",
      autoCheckInByGeofence: initialData?.autoCheckInByGeofence || false,
      forceCheckInBeforeStart: initialData?.forceCheckInBeforeStart || false,
    },
    mode: "onBlur",
  });

  const watchedDays = useWatch({ control: form.control, name: 'days' as any }) as string[] | undefined;
  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([]);
  const [fallbackSupervisor, setFallbackSupervisor] = useState<{ id: string; name: string } | null>(null);
  const [sites, setSites] = useState<{ id: string; name: string; address?: string; lat?: number | string; lng?: number | string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; name: string; licensePlate?: string }[]>([]);
  const [fallbackVehicle, setFallbackVehicle] = useState<{ id: string; name: string; licensePlate?: string } | null>(null);
  const [points, setPoints] = useState<Array<{
    siteId: string;
    siteName?: string;
    address?: string;
    duration: number;
    scheduledHits: number;
    lat?: number | null;
    lng?: number | null;
  }>>(initialData?.points?.map((p) => ({
    siteId: p.siteId,
    siteName: p.siteName,
    address: p.address || '',
    duration: p.duration ?? 5,
    scheduledHits: p.scheduledHits ?? 1,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
  })) || []);
  const [pointOrder, setPointOrder] = useState<string | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        continuous: initialData.continuous ?? true,
        dateFrom: initialData.dateFrom || "",
        startTime: initialData.startTime || "00:00",
        dateTo: initialData.dateTo || "",
        endTime: initialData.endTime || "23:59",
        days: initialData.days || [],
          supervisorId: initialSupervisorId ? String(initialSupervisorId) : "",
        siteIds: initialData.siteIds || [],
        vehicleId: initialData.vehicleId ? String(initialData.vehicleId) : "",
        syncHitsBetweenGuards: initialData.syncHitsBetweenGuards || false,
        forceVehicleRouteOrder: initialData.forceVehicleRouteOrder || false,
        notifyBefore: initialData.notifyBefore || "00:15",
        autoCheckInByGeofence: initialData.autoCheckInByGeofence || false,
        forceCheckInBeforeStart: initialData.forceCheckInBeforeStart || false,
      });
      setPoints(initialData.points?.map((p) => ({
        siteId: p.siteId,
        siteName: p.siteName,
        address: p.address || '',
        duration: p.duration ?? 5,
        scheduledHits: p.scheduledHits ?? 1,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
      })) || []);

      if (initialSupervisorId) {
        const name = initialSupervisorName || String(initialSupervisorId);
        setFallbackSupervisor({ id: String(initialSupervisorId), name });
        setSupervisors((prev) =>
          prev.some((p) => String(p.id) === String(initialSupervisorId))
            ? prev
            : [...prev, { id: String(initialSupervisorId), name }]
        );
      }

      if (initialData.vehicleId && (initialData.vehicleName || initialData.vehicleLicensePlate)) {
        setFallbackVehicle({
          id: String(initialData.vehicleId),
          name: String(initialData.vehicleName || initialData.vehicleLicensePlate || initialData.vehicleId),
          licensePlate: initialData.vehicleLicensePlate,
        });
        setVehicles((prev) =>
          prev.some((v) => String(v.id) === String(initialData.vehicleId))
            ? prev
            : [
                ...prev,
                {
                  id: String(initialData.vehicleId),
                  name: String(initialData.vehicleName || initialData.vehicleLicensePlate || String(initialData.vehicleId)),
                  licensePlate: initialData.vehicleLicensePlate || undefined,
                },
              ]
        );
      }
    }
  }, [initialData]);

  // If we have initialData with only IDs (no names), fetch fallbacks so the select shows the text.
  // Keyed ONLY on the IDs — collections/fallbacks are read/updated via functional setState so a
  // successful set does not re-trigger this effect (avoids refetch/render churn loops).
  const initialVehicleId = initialData?.vehicleId ? String(initialData.vehicleId) : '';
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supId = initialSupervisorId ? String(initialSupervisorId) : '';
        if (supId) {
          try {
            const u = await userService.fetchUser(supId);
            if (!mounted) return;
            if (u) {
              const name = u.displayName || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || supId;
              const fb = { id: supId, name };
              if (import.meta.env.DEV) console.debug('[RouteForm] fetched fallback supervisor', fb);
              setFallbackSupervisor((prev) => (prev && String(prev.id) === supId ? prev : fb));
              setSupervisors((prev) => (prev.some((p) => String(p.id) === supId) ? prev : [...prev, fb]));
            }
          } catch (err) {
            // ignore fetch failures — fallback may be set elsewhere
          }
        }

        const vehId = initialVehicleId;
        if (vehId) {
          try {
            const v = await vehicleService.find(vehId);
            if (!mounted) return;
            if (v) {
              const name = v.name || v.model || v.licensePlate || vehId;
              const fbv = { id: vehId, name, licensePlate: v.licensePlate || undefined };
              if (import.meta.env.DEV) console.debug('[RouteForm] fetched fallback vehicle', fbv);
              setFallbackVehicle((prev) => (prev && String(prev.id) === vehId ? prev : fbv));
              setVehicles((prev) => (prev.some((p) => String(p.id) === vehId) ? prev : [...prev, fbv]));
            }
          } catch (err) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSupervisorId, initialVehicleId]);

  useEffect(() => {
    if (!fallbackSupervisor) return;
    setSupervisors((prev) =>
      prev.some((s) => s.id === fallbackSupervisor.id)
        ? prev
        : [...prev, fallbackSupervisor]
    );
  }, [fallbackSupervisor]);

  useEffect(() => {
    let mounted = true;

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

        setSupervisors((prev) => {
          const mapped = filtered.map((u: any) => ({
            id: String(u.id),
            name: u.displayName || (u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : undefined) || u.name || u.email || String(u.id),
          }));
          // only append fallback supervisor if it appears active in the fetched results
          if (fallbackSupervisor) {
            const found = (res || []).find((u: any) => String(u.id) === String(fallbackSupervisor.id));
            if (found && isUserActive(found) && !mapped.some((s) => s.id === fallbackSupervisor.id)) {
              return [...mapped, fallbackSupervisor];
            }
          }
          return mapped;
        });
      } catch (e) {
        console.error('Error loading supervisors', e);
        try { toast.error(String((e as any)?.message || (e as any)?.toString() || 'Error cargando supervisores')); } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error cargando supervisores', details: e }); } catch {}
      }
    })();

    (async () => {
      try {
        const res: any = await postSiteService.list({}, { limit: 100, offset: 0 });
        const rows = res && res.rows ? res.rows : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        const mappedSites = rows.map((s: any) => {
          const rawLat = s.latitud ?? s.latitude ?? s.lat ?? s.locationLat ?? undefined;
          const rawLng = s.longitud ?? s.longitude ?? s.lng ?? s.locationLng ?? undefined;
          let lat = parseCoord(rawLat);
          let lng = parseCoord(rawLng);
          const latValid = lat != null && lat >= -90 && lat <= 90;
          const lngValid = lng != null && lng >= -180 && lng <= 180;
          if ((!latValid && lng != null && lng >= -90 && lng <= 90) && (lat != null && (lat >= -180 && lat <= 180))) {
            const tmp = lat;
            lat = lng;
            lng = tmp;
          }
          const siteName = s.companyName || s.name || (s.company && (s.company.name || s.company.companyName)) || String(s.id);
          return { id: String(s.id), name: siteName, address: s.address || s.location || s.postalAddress || '', lat, lng };
        });
        setSites(mappedSites);

        // Patch existing points that may have been initialized from initialData without siteName
        setPoints((prev) => {
          if (!prev || !prev.length) return prev;
          const byId = new Map<string, any>(mappedSites.map((m: any) => [String(m.id), m]));
          return prev.map((p) => {
            const id = String(p.siteId);
            const s: any = byId.get(id);
            if (!s) return p;
            return {
              ...p,
              siteName: p.siteName || s.name,
              address: p.address || s.address || '',
              lat: p.lat ?? (s.lat != null ? Number(s.lat) : null),
              lng: p.lng ?? (s.lng != null ? Number(s.lng) : null),
            };
          });
        });
      } catch (e) {
        console.error('Error loading sites', e);
        try { toast.error(String((e as any)?.message || (e as any)?.toString() || 'Error cargando Puestos de Vigilancia')); } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error cargando Puestos de Vigilancia', details: e }); } catch {}
      }
    })();

    (async () => {
      try {
        const res: any = await vehicleService.list({ limit: 100 });
        const rows = res && res.rows ? res.rows : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        const mapped: Array<{ id: string; name: string; licensePlate?: string }> = rows.length
          ? rows.map((v: any) => ({
              id: String(v.id),
              name: v.name || '',
              licensePlate: v.licensePlate || '',
            }))
          : [];
        setVehicles((prev) => {
          const merged: Array<{ id: string; name: string; licensePlate?: string }> = mapped.slice();
          if (fallbackVehicle && !merged.some((v) => v.id === fallbackVehicle.id)) {
            merged.push(fallbackVehicle);
          }
          return merged;
        });
      } catch (e) {
        console.warn('vehicleService.list failed', e);
        setVehicles([]);
        try { toast.error(String((e as any)?.message || (e as any)?.toString() || 'Error cargando vehículos')); } catch {}
        try { telemetryService.log({ level: 'error', message: 'Error cargando vehículos', details: e }); } catch {}
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fallbackSupervisor]);

  const daysText = useMemo(() => {
    const d = watchedDays ?? [];
    if (!d.length) return ", , , , , ,";
    return d.map((k: any) => DAY_LABEL[k]).join(", ");
  }, [watchedDays]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'siteIds') {
        const selected = (value.siteIds || []) as string[];
        setPoints((prev) => {
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
    const cur = form.getValues('siteIds') || [];
    form.setValue('siteIds', (cur as string[]).filter((x) => x !== siteId));
    setPoints((prev) => prev.filter((p) => p.siteId !== siteId));
  };

  const updatePointField = (siteId: string, field: 'duration' | 'scheduledHits' | 'address', value: any) => {
    setPoints((prev) => prev.map((p) => (p.siteId === siteId ? { ...p, [field]: value } : p)));
  };

  const onSubmit = async (data: RouteCreateSchema) => {
    try {
      setSubmitting(true);
      const payload = {
        ...data,
        assignedGuard: data.supervisorId,
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

      const resp = mode === 'edit' && routeId
        ? await routeService.update(routeId, payload)
        : await routeService.create(payload);

      toast.success(mode === 'edit' ? 'Ruta actualizada' : 'Ruta creada');
      onSuccess?.();
    } catch (err: any) {
      console.error('Error guardando ruta', err);
      try {
        const msg = err?.message || err?.toString() || (err?.details && JSON.stringify(err.details)) || 'Error guardando ruta';
        toast.error(String(msg));
      } catch {}
      try { telemetryService.log({ level: 'error', message: 'Error guardando ruta', details: err }); } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  return (
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

        <FormField
          control={form.control}
          name="supervisorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asignar Supervisor*</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar supervisor">
                    {(() => {
                      const id = String(field.value || '');
                      const found = supervisors.find((x) => String(x.id) === id);
                      if (!found && fallbackSupervisor && String(fallbackSupervisor.id) === id) {
                        console.debug('[RouteForm] SelectValue supervisor - using fallback', { id, fallbackSupervisor, fieldValue: field.value, initialDataSupervisorId: initialData?.supervisorId, initialDataSupervisorName: initialData?.supervisorName, supervisorsCount: supervisors.length });
                        return fallbackSupervisor.name;
                      }
                      if (found) {
                        console.debug('[RouteForm] SelectValue supervisor - found in supervisors list', { id, found, supervisorsCount: supervisors.length });
                        return found.name;
                      }
                      if (initialSupervisorId && String(initialSupervisorId) === id) {
                        console.debug('[RouteForm] SelectValue supervisor - using initialData name', { id, initialName: initialSupervisorName });
                        return initialSupervisorName || undefined;
                      }
                      console.debug('[RouteForm] SelectValue supervisor - nothing matched', { id, fieldValue: field.value, supervisorsCount: supervisors.length, fallbackSupervisor, initialSupervisorName: initialData?.supervisorName });
                      return undefined;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugSupervisor') === '1' && (
                <pre className="mt-2 p-2 rounded bg-muted/30 text-xs text-black">
                  {JSON.stringify({
                    fieldValue: field.value,
                    supervisors,
                    fallbackSupervisor,
                    initialSupervisorId: initialData?.supervisorId,
                    initialSupervisorName: initialData?.supervisorName,
                  }, null, 2)}
                </pre>
              )}
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
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-muted/30">
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
                            <button type="button" onClick={() => movePoint(idx, -1)} className="rounded border px-2 py-1"><ChevronUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => movePoint(idx, 1)} className="rounded border px-2 py-1"><ChevronDown className="h-3.5 w-3.5" /></button>
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
                      return sv ? [sv.name, sv.licensePlate].filter(Boolean).join(' • ') : undefined;
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

        <FormField
          control={form.control}
          name="syncHitsBetweenGuards"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox id="syncHits" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="syncHits" className="cursor-pointer">
                Sincronizar pasadas entre supervisores
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
                Forzar al supervisor a seguir la ruta de patrulla vehicular en orden
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

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary text-white hover:bg-primary" disabled={submitting || form.formState.isSubmitting}>
            {submitting ? 'Enviando...' : (mode === 'edit' ? 'Actualizar' : 'Enviar')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
