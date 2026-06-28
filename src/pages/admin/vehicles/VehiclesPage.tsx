import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

import { Search, Filter as FilterIcon, MoreVertical, Eye, Edit, Archive, Car, CheckCircle2, PauseCircle } from "lucide-react";
import { PageContainer, PageHeader, Section, Stagger, StatCard, StatusBadge, EmptyState } from '@/components/kit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
        DropdownMenu,
        DropdownMenuTrigger,
        DropdownMenuContent,
        DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
    vehicleFiltersSchema,
    type VehicleFilters,
    defaultVehicleFilters,
} from "@/lib/validators/vehicle-filters";
import vehicleService from '@/lib/api/vehicleService';

export default function VehiclesPage() {
    const [openFilter, setOpenFilter] = useState(false);
    const [filters, setFilters] = useState<VehicleFilters>(defaultVehicleFilters);

    const [rows, setRows] = useState<any[]>([]);
    const [count, setCount] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
    const [archiveLoading, setArchiveLoading] = useState<boolean>(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [bulkActionConfirm, setBulkActionConfirm] = useState<string | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
    const [detailsId, setDetailsId] = useState<string | null>(null);
    const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
    const [detailsVehicle, setDetailsVehicle] = useState<any | null>(null);

    const aplicarFiltros = () => {
        const parse = vehicleFiltersSchema.safeParse(filters);
        if (!parse.success) {
            console.error(parse.error.flatten());
            return;
        }
        console.log("Aplicando filtros:", parse.data);
        setOpenFilter(false);
    };

    const handleBulkActionSelect = (action: string) => {
        if (!action) return;
        setSelectedAction(action);
        if (!selectedIds || selectedIds.length === 0) return;
        setBulkActionConfirm(action);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(rows.map((r) => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        } else {
            setSelectedIds((prev) => prev.filter((x) => x !== id));
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const perPageNum = Number(filters.perPage || 10);
            const params: any = {
                limit: perPageNum,
                offset: (page - 1) * perPageNum,
            };

            if (filters.search) params.query = filters.search;
            if (filters.status) params.active = filters.status === 'activo';

            const resp = await vehicleService.list(params);
            setRows(resp.rows || []);
            setCount(resp.count || 0);
        } catch (err) {
            console.error('Error cargando vehículos', err);
            setRows([]);
            setCount(0);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [filters, page]);

    useEffect(() => {
        // when perPage changes, reset to first page
        setPage(1);
    }, [filters.perPage]);

    const navigate = useNavigate();

    const perPageText = useMemo(() => {
        if (filters.perPage === "10") return "10";
        if (filters.perPage === "25") return "25";
        return "50";
    }, [filters.perPage]);

    const perPageNum = Number(filters.perPage || 10);
    const start = count === 0 ? 0 : (page - 1) * perPageNum + 1;
    const end = Math.min(page * perPageNum, count);
    const totalPages = Math.max(1, Math.ceil(count / perPageNum || 1));

    const handlePrevPage = () => {
        if (page <= 1) return;
        setPage((p) => p - 1);
    };

    const handleNextPage = () => {
        if (page >= totalPages) return;
        setPage((p) => p + 1);
    };

    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    const selectedCount = selectedRows.length;
    const allActive = selectedCount > 0 && selectedRows.every((r) => r.active === true);
    const allInactive = selectedCount > 0 && selectedRows.every((r) => r.active === false);
    const mixed = selectedCount > 0 && !allActive && !allInactive;
    const availableActions: Array<{ value: string; label: string }> = [];
    if (allActive) {
        availableActions.push({ value: 'inactivar', label: 'Inactivar' });
    } else if (allInactive) {
        availableActions.push({ value: 'activar', label: 'Activar' });
        availableActions.push({ value: 'eliminar', label: 'Eliminar' });
    } else if (mixed) {
        availableActions.push({ value: 'activar', label: 'Activar' });
        availableActions.push({ value: 'inactivar', label: 'Inactivar' });
        availableActions.push({ value: 'eliminar', label: 'Eliminar' });
    }

    const viewVehicle = async (id: string) => {
        setDetailsId(id);
        setDetailsLoading(true);
        try {
            const resp = await vehicleService.find(id);
            setDetailsVehicle(resp);
        } catch (err) {
            console.error('Error cargando detalles del vehículo', err);
            setDetailsVehicle(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const editVehicle = (id: string) => {
        // Open the create/edit page and pass the id to edit via location state
        navigate('/vehicle-patrol/vehicles/add-vehicle', { state: { editId: id } });
    };

    const archiveVehicle = (id: string) => {
        setArchiveConfirmId(id);
    };

    const confirmArchive = async () => {
        if (!archiveConfirmId) return;
        setArchiveLoading(true);
        try {
            await vehicleService.update(archiveConfirmId, { active: false });
            toast.success('Vehículo inactivado');
            setArchiveConfirmId(null);
            await load();
        } catch (err) {
            console.error('Error archivando vehículo', err);
            toast.error('Error inactivando vehículo');
        } finally {
            setArchiveLoading(false);
        }
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Vehículos" },
                ]}
            />

            <PageContainer width="wide" className="px-4 py-6 sm:px-6">
                <PageHeader
                    icon={<Car />}
                    title="Vehículos"
                    subtitle="Flota de la empresa y su estado operativo"
                    actions={(
                        <>
                            <Button variant="brand" asChild>
                                <Link to="/vehicle-patrol/vehicles/add-vehicle">Nuevo vehículo</Link>
                            </Button>
                            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                                <SheetTrigger asChild>
                                    <Button variant="outline">
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
                                                onValueChange={(v) => setFilters((s) => ({ ...s, categoryId: v }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Default" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="flota-a">Flota A</SelectItem>
                                                    <SelectItem value="flota-b">Flota B</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Estado</Label>
                                            <Select
                                                value={filters.status}
                                                onValueChange={(v) =>
                                                    setFilters((s) => ({ ...s, status: v as VehicleFilters["status"] }))
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
                                            variant="brand"
                                            className="w-full"
                                            onClick={aplicarFiltros}
                                        >
                                            Filtro
                                        </Button>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </>
                    )}
                />

                <Stagger className="grid gap-4 sm:grid-cols-3">
                    <StatCard label="Total" value={count} icon={<Car />} accent="primary" />
                    <StatCard label="Activos" value={rows.filter((r) => r.active).length} icon={<CheckCircle2 />} accent="green" />
                    <StatCard label="Inactivos" value={rows.filter((r) => !r.active).length} icon={<PauseCircle />} accent="slate" />
                </Stagger>

                <Section
                    title="Listado de vehículos"
                    icon={<Car />}
                    action={(
                        <div className="flex items-center gap-2">
                            <Select disabled={selectedIds.length === 0} value={selectedAction ?? undefined} onValueChange={(v) => handleBulkActionSelect(v)}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Acciones" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableActions.map((a) => (
                                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="w-56 pl-9"
                                    placeholder="Buscar vehículo"
                                    value={filters.search ?? ''}
                                    onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}
                    contentClassName="-mx-5 -mb-5"
                >
                    <div className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/30 text-left text-sm text-foreground/70">
                                    <tr>
                                        <th className="px-4 py-2">
                                            <input
                                                type="checkbox"
                                                checked={rows.length > 0 && selectedIds.length === rows.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                            />
                                        </th>
                                        <th className="px-4 py-2">Año</th>
                                        <th className="px-4 py-2">Marca</th>
                                        <th className="px-4 py-2">Modelo</th>
                                        <th className="px-4 py-2">Placa</th>
                                        <th className="px-4 py-2">Estado</th>
                                        <th className="px-4 py-2 text-right" />
                                    </tr>
                                </thead>

                                <tbody className="bg-card divide-y divide-border text-sm">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando...</td>
                                        </tr>
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-6">
                                                <EmptyState icon={<Car />} title="No se encontraron resultados" description="No hay vehículos que coincidan con los filtros." />
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((r) => (
                                            <tr key={r.id} className="text-sm">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(r.id)}
                                                                onChange={(e) => handleSelectOne(r.id, e.target.checked)}
                                                            />
                                                        </td>
                                                <td className="px-4 py-3">{r.year || '-'}</td>
                                                <td className="px-4 py-3">{r.make || '-'}</td>
                                                <td className="px-4 py-3">{r.model || '-'}</td>
                                                <td className="px-4 py-3">{r.licensePlate || '-'}</td>
                                                <td className="px-4 py-3"><StatusBadge tone={r.active ? 'green' : 'slate'}>{r.active ? 'Activo' : 'Inactivo'}</StatusBadge></td>
                                                <td className="px-2 py-3">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border-slate-200 text-foreground/70" type="button">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem onClick={() => viewVehicle(r.id)}>
                                                                <Eye className="mr-2 h-4 w-4" /> Ver detalles
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => editVehicle(r.id)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => archiveVehicle(r.id)}>
                                                                <Archive className="mr-2 h-4 w-4" /> Inactivar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <AlertDialog open={!!archiveConfirmId} onOpenChange={(open) => !open && setArchiveConfirmId(null)}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Inactivar vehículos</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <div className="p-4">
                                        ¿Estás seguro de que deseas inactivar 1 vehículo(s)?
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setArchiveConfirmId(null)}>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={confirmArchive} className="bg-red-600 hover:bg-red-700" disabled={archiveLoading}>
                                            Confirmar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog open={!!bulkActionConfirm} onOpenChange={(open) => !open && setBulkActionConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {bulkActionConfirm === 'activar' && 'Activar vehículos'}
                                    {bulkActionConfirm === 'inactivar' && 'Inactivar vehículos'}
                                    {bulkActionConfirm === 'eliminar' && 'Eliminar vehículos'}
                                </AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="p-4">
                                ¿Estás seguro de que deseas {bulkActionConfirm} {selectedIds.length} vehículo(s)?
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setBulkActionConfirm(null)}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={async () => {
                                        if (!bulkActionConfirm) return;
                                        setBulkActionLoading(true);
                                        try {
                                            if (bulkActionConfirm === 'eliminar') {
                                                const idsToDelete = selectedIds.filter((id) => {
                                                    const r = rows.find((x) => x.id === id);
                                                    return r && r.active === false;
                                                });
                                                if (idsToDelete.length === 0) {
                                                    toast.info('No hay registros inactivos para eliminar');
                                                } else {
                                                    await vehicleService.destroy(idsToDelete);
                                                    toast.success(`${idsToDelete.length} vehículo(s) eliminados`);
                                                }
                                            } else {
                                                const active = bulkActionConfirm === 'activar';
                                                await Promise.all(selectedIds.map((id) => vehicleService.update(id, { active })));
                                                toast.success('Acción ejecutada');
                                            }
                                            setSelectedIds([]);
                                            setSelectedAction(null);
                                            setBulkActionConfirm(null);
                                            await load();
                                        } catch (err) {
                                            console.error('Error ejecutando acción masiva', err);
                                            toast.error('Error ejecutando la acción');
                                        } finally {
                                            setBulkActionLoading(false);
                                        }
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={bulkActionLoading}
                                >
                                    Confirmar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Dialog open={!!detailsId} onOpenChange={(open) => { if (!open) { setDetailsId(null); setDetailsVehicle(null); } }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Detalles del vehículo</DialogTitle>
                                <DialogDescription>
                                    Información completa del vehículo.
                                </DialogDescription>
                            </DialogHeader>

                            {detailsLoading ? (
                                <div className="p-4">Cargando...</div>
                            ) : detailsVehicle ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
                                    <div>
                                        <div className="mb-2 text-sm font-medium">Nombre</div>
                                        <div className="text-sm">{detailsVehicle.name || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Placa</div>
                                        <div className="text-sm">{detailsVehicle.licensePlate || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Año</div>
                                        <div className="text-sm">{detailsVehicle.year || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Marca</div>
                                        <div className="text-sm">{detailsVehicle.make || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Modelo</div>
                                        <div className="text-sm">{detailsVehicle.model || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Color</div>
                                        <div className="text-sm">{detailsVehicle.color || '-'}</div>
                                    </div>

                                    <div>
                                        <div className="mb-2 text-sm font-medium">VIN</div>
                                        <div className="text-sm">{detailsVehicle.vin || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Kilometraje inicial</div>
                                        <div className="text-sm">{detailsVehicle.initialMileage ?? '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Propiedad</div>
                                        <div className="text-sm">{detailsVehicle.ownership || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Descripción</div>
                                        <div className="text-sm">{detailsVehicle.description || '-'}</div>

                                        <div className="mt-4 text-sm font-medium">Imagen</div>
                                        <div className="text-sm">
                                            {detailsVehicle.imageUrl && detailsVehicle.imageUrl.length > 0 ? (
                                                <img src={detailsVehicle.imageUrl[0].downloadUrl || detailsVehicle.imageUrl[0].publicUrl} alt="vehículo" className="max-h-48 rounded" />
                                            ) : (
                                                <span className="text-muted-foreground">Sin imagen</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4">No se encontró información del vehículo.</div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setDetailsId(null); setDetailsVehicle(null); }}>Cerrar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="flex items-center justify-between bg-muted/30 px-4 py-3 text-sm text-foreground/70">
                        <div className="flex items-center gap-2">
                            <span>Elementos por página</span>
                            <Select
                                value={filters.perPage}
                                onValueChange={(v) => setFilters((s: any) => ({ ...s, perPage: v }))}
                            >
                                <SelectTrigger className="h-8 w-20">
                                    <SelectValue placeholder={perPageText} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-center w-full">{start} - {end} de {count}</div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages}>Siguiente</Button>
                        </div>
                    </div>
                </Section>
            </PageContainer>
        </AppLayout>
    );
}
