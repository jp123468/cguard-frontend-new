import { useMemo, useState, useEffect } from "react";
import routeService from "@/lib/api/routeService";
import { postSiteService } from '@/lib/api/postSiteService';
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, Filter as FilterIcon, Plus, Route as RouteIcon } from "lucide-react";
import { PageContainer, PageHeader, Section, EmptyState, StatusBadge } from '@/components/kit';
import RouteDetailModal from './RouteDetailModal';

import {
  routeFiltersSchema,
  type RouteFilters,
  defaultRouteFilters,
} from "@/lib/validators/route-filters";

export default function RoutesPage() {
  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<RouteFilters>(defaultRouteFilters);

  const [rows, setRows] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { t } = useTranslation();

  const [limit, setLimit] = useState<number>(Number(filters.perPage || 25));
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await routeService.list({ limit, offset: (page - 1) * limit });
        if (!mounted) return;
        const initialRows = resp.rows || [];
        setRows(initialRows);
        setTotalCount(typeof resp.count === 'number' ? resp.count : (initialRows || []).length);

        // Resolve missing post-site names for points if backend didn't include them
        (async () => {
          try {
            const missingSiteIds = new Set<string>();
            (initialRows || []).forEach((r: any) => {
              if (r.points && Array.isArray(r.points)) {
                r.points.forEach((p: any) => {
                  if (!p.siteName && (p.siteId || p.postSiteId)) {
                    missingSiteIds.add(String(p.siteId || p.postSiteId));
                  }
                });
              }
            });

            if (missingSiteIds.size === 0) return;

            const ids = Array.from(missingSiteIds);
            const results = await Promise.all(ids.map((id) => postSiteService.get(id).catch(() => null)));
            const map = new Map<string, any>();
            results.forEach((res: any, i: number) => {
              const id = ids[i];
              if (res) map.set(id, res.companyName || res.name || (res.company && (res.company.name || res.company.companyName)) || String(res.id));
            });

            if (map.size > 0) {
              setRows((prev) => (prev || []).map((r: any) => ({
                ...r,
                points: (r.points || []).map((p: any) => ({
                  ...p,
                  siteName: p.siteName || map.get(String(p.siteId || p.postSiteId)) || p.siteName,
                })),
              })));
            }
          } catch (e) {
            console.warn('Failed to resolve post site names for routes', e);
          }
        })();
      } catch (e) {
        console.error('Error loading routes', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [limit, page]);

  const aplicarFiltros = () => {
    const parse = routeFiltersSchema.safeParse(filters);
    if (!parse.success) {
      console.error(parse.error.flatten());
      return;
    }
    console.log("Aplicando filtros:", parse.data);
    setOpenFilter(false);
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Rutas" },
        ]}
      />

      <PageContainer width="wide" className="px-6">
        <PageHeader
          icon={<RouteIcon />}
          title="Rutas"
          subtitle="Define y gestiona las rutas de patrullaje vehicular de tus puestos."
          actions={(
            <Button variant="brand" asChild>
              <Link to={(() => {
                try {
                  const t = localStorage.getItem('tenantId');
                  return t ? `/tenant/${t}/vehicle-patrol/routes/add-new` : '/vehicle-patrol/routes/add-new';
                } catch (e) {
                  return '/vehicle-patrol/routes/add-new';
                }
              })()}>
                <Plus className="mr-1 h-4 w-4" /> Nueva ruta
              </Link>
            </Button>
          )}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => console.log("Acción:", v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activar">Activar</SelectItem>
                <SelectItem value="inactivar">Inactivar</SelectItem>
                <SelectItem value="eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-72 pl-9"
                placeholder="Buscar ruta"
                onChange={(e) => console.log("buscar:", e.target.value)}
              />
            </div>

            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-primary/30 text-primary">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[400px] sm:w-[460px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <Label>Sectores</Label>
                    <Select
                      value={filters.categoryId ?? ""}
                      onValueChange={(v) =>
                        setFilters((s) => ({ ...s, categoryId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="turno-dia">Turno día</SelectItem>
                        <SelectItem value="turno-noche">Turno noche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) =>
                        setFilters((s) => ({
                          ...s,
                          status: v as RouteFilters["status"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Activo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-primary text-white hover:bg-primary"
                    onClick={aplicarFiltros}
                  >
                    Filtro
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Section icon={<RouteIcon />} title="Listado de rutas" contentClassName="overflow-hidden rounded-xl border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Checkbox />
                </th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Puesto de seguridad</th>
                <th className="px-4 py-3 font-semibold">Supervisor</th>
                <th className="px-4 py-3 font-semibold">Vehículo</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10">
                    <EmptyState
                      icon={<RouteIcon />}
                      title="No se encontraron resultados"
                      description="No pudimos encontrar ninguna ruta que coincida con tu búsqueda."
                    />
                  </td>
                </tr>
              )}
              {rows.length > 0 && rows.map((r: any) => (
                <tr key={r.id || r._id} className="border-b">
                  <td className="px-4 py-3">
                    <Checkbox />
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name || r.title || r.routeName || '—'}</td>
                  <td className="px-4 py-3">{(() => {
                    const pts = r.points && Array.isArray(r.points) ? r.points : [];
                    if (pts.length > 0) {
                      const names = pts.map((p: any) => p.siteName || p.address || p.postSiteId).filter(Boolean);
                      if (names.length === 0) return r.address || '—';
                      if (names.length <= 2) return names.join(', ');
                      return `${names.slice(0, 2).join(', ')} (+${names.length - 2} más)`;
                    }
                    return r.address || '—';
                  })()}</td>
                  <td className="px-4 py-3">{(() => {
                    const g = r.assignedGuard || r.guard || r.supervisor || r.supervisorId || r.guardId;
                    if (!g) return '—';
                    if (typeof g === 'string') return g;
                    if (typeof g === 'object') {
                      const first = g.firstName || g.first_name || g.name || '';
                      const last = g.lastName || g.last_name || '';
                      const full = `${first} ${last}`.trim();
                      if (full) return full;
                      return g.email || g.id || '—';
                    }
                    return String(g);
                  })()}</td>
                  <td className="px-4 py-3">{(r.vehicle && (r.vehicle.plate || r.vehicle.name)) || r.vehicleId || '—'}</td>
                  <td className="px-4 py-3">{(() => {
                    if (r.continuous !== undefined && r.continuous !== null) {
                      return r.continuous ? 'Continua' : 'Programada';
                    }
                    const t = r.type || r.routeType;
                    if (!t) return r.isPatrol ? 'Patrulla' : '—';
                    if (typeof t === 'string') return t;
                    if (typeof t === 'object') return t.name || t.label || t.type || '—';
                    return String(t);
                  })()}</td>
                  <td className="px-4 py-3">
                    {(r.active === false)
                      ? <StatusBadge tone="slate">Inactivo</StatusBadge>
                      : <StatusBadge tone="green">Activo</StatusBadge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setDetailId(r.id); setDetailOpen(true); }}>Ver</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-foreground/70 bg-muted/30 border-x border-b rounded-b-lg">
            <div className="flex items-center gap-2">
              <span>{t('clients.pagination.itemsPerPage', 'Elementos por página')}</span>
              <Select
                value={limit.toString()}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 min-w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {page} – {Math.max(1, Math.ceil(totalCount / limit))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('clients.pagination.prev', 'Anterior')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * limit >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('clients.pagination.next', 'Siguiente')}
              </Button>
            </div>
          </div>
        </Section>
        <RouteDetailModal open={detailOpen} onOpenChange={(v) => { if (!v) setDetailId(null); setDetailOpen(v); }} routeId={detailId} />
      </PageContainer>
    </AppLayout>
  );
}
