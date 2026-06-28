import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Plus, Search, EllipsisVertical, Pencil, Trash2, CheckCircle2, Briefcase, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { projectService, type ClientProject, type ProjectFilters } from '@/lib/api/projectService';
import { PROJECT_TYPES, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/projectTypes';
import { ProjectTypeBadge, ProjectStatusBadge } from '@/components/projects/ProjectBadge';
import { PageContainer, PageHeader, Section, EmptyState } from '@/components/kit';
import ProjectForm from './ProjectForm';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 25;

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [tempFilters, setTempFilters] = useState<ProjectFilters>({});
  const [openFilter, setOpenFilter] = useState(false);

  // Create / Edit dialog
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>(undefined);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const q = searchQuery.trim();
      const active = { ...filters, ...(q ? { name: q } : {}) };
      const { rows, count } = await projectService.list(active, {
        limit,
        offset: (page - 1) * limit,
      });
      setProjects(rows);
      setTotalCount(count);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [searchQuery, filters]);
  useEffect(() => { loadProjects(); }, [page, searchQuery, filters]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await projectService.delete([deleteTargetId]);
      toast.success('Proyecto eliminado');
      setDeleteTargetId(undefined);
      loadProjects();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await projectService.update(id, { status: 'completed' });
      toast.success('Proyecto marcado como completado');
      loadProjects();
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const from = projects.length > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, totalCount);
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Proyectos' },
        ]}
      />

      <PageContainer width="wide" className="px-4">
        <PageHeader
          icon={<FolderKanban />}
          title="Proyectos"
          subtitle="Gestiona los proyectos de tus clientes, su estado y avance."
          actions={(
            <Button
              variant="brand"
              onClick={() => { setEditingId(undefined); setOpenForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo proyecto
            </Button>
          )}
        />

        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proyectos"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <Sheet open={openFilter} onOpenChange={setOpenFilter}>
              <SheetTrigger asChild>
                <Button variant="outline" className="text-primary border-primary/30">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[360px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de proyecto</Label>
                    <Select
                      value={tempFilters.type || 'all'}
                      onValueChange={(v) => setTempFilters({ ...tempFilters, type: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {PROJECT_TYPES.map((pt) => (
                          <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={tempFilters.status || 'all'}
                      onValueChange={(v) => setTempFilters({ ...tempFilters, status: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    onClick={() => { setFilters({ ...tempFilters }); setOpenFilter(false); }}
                  >
                    Aplicar filtros
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setTempFilters({}); setFilters({}); setSearchQuery(''); setOpenFilter(false); }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Table */}
        <Section icon={<Briefcase />} title="Listado de proyectos" contentClassName="overflow-hidden rounded-xl border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 font-semibold">Proyecto</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Fecha inicio</th>
                <th className="px-4 py-3 font-semibold">Fecha fin</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10">
                    <EmptyState
                      icon={<FolderKanban />}
                      title="No se encontraron proyectos"
                      description="Crea tu primer proyecto para empezar a organizar el trabajo de tus clientes."
                      action={(
                        <Button variant="brand" onClick={() => { setEditingId(undefined); setOpenForm(true); }}>
                          <Plus className="h-4 w-4 mr-1" /> Nuevo proyecto
                        </Button>
                      )}
                    />
                  </td>
                </tr>
              )}

              {projects.map((p) => {
                const clientLabel = p.clientAccount
                  ? (p.clientAccount.commercialName || [p.clientAccount.name, p.clientAccount.lastName].filter(Boolean).join(' '))
                  : '-';
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium max-w-[200px]">
                      <div className="truncate">{p.name}</div>
                      {p.location && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{p.location}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectTypeBadge value={p.type} />
                    </td>
                    <td className="px-4 py-3 text-foreground">{clientLabel}</td>
                    <td className="px-4 py-3 text-foreground/70">{p.startDate ?? '-'}</td>
                    <td className="px-4 py-3 text-foreground/70">{p.endDate ?? '-'}</td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge value={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-muted">
                            <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingId(p.id); setOpenForm(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          {p.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleMarkComplete(p.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Marcar completado
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTargetId(p.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between text-sm text-foreground/70">
            <span>Mostrando {from}–{to} de {totalCount}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          </DialogHeader>
          <ProjectForm
            mode={editingId ? 'edit' : 'create'}
            projectId={editingId}
            onSaved={() => { setOpenForm(false); loadProjects(); }}
            onCancel={() => setOpenForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este proyecto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
