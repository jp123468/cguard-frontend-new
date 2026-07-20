import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { GraduationCap, Plus, Search, EllipsisVertical, Pencil, Trash2, Users, Award, Lock, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer, PageHeader, Section, EmptyState, SkeletonCards, Stagger, StatCard, StatusBadge } from '@/components/kit';
import { usePermissions } from '@/hooks/usePermissions';
import {
  trainingCourseService,
  type TrainingCourse,
  type TrainingCourseInput,
} from '@/lib/api/trainingCourseService';
import { TRAINING_CATEGORIES, TRAINING_LEVELS, categoryLabel, levelLabel } from './trainingConstants';

const emptyForm: TrainingCourseInput = {
  title: '',
  description: '',
  category: 'security',
  level: 'beginner',
  pointsValue: 10,
  passingScore: 70,
};

export default function TrainingCoursesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission('trainingCourseRead');
  const canCreate = hasPermission('trainingCourseCreate');
  const canEdit = hasPermission('trainingCourseEdit');
  const canDestroy = hasPermission('trainingCourseDestroy');

  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<TrainingCourseInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingCourseService.list(
        categoryFilter !== 'all' ? { category: categoryFilter as any } : {},
        { limit: 100, offset: 0 },
      );
      setCourses(res.rows);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los cursos.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  const filtered = courses.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const publishedCount = courses.filter((c) => c.published).length;
  const draftCount = courses.length - publishedCount;

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('El título es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const created = await trainingCourseService.create(form);
      toast.success('Curso creado.');
      setOpenForm(false);
      setForm(emptyForm);
      navigate(`/training/courses/${created.id}`);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo crear el curso.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await trainingCourseService.remove(deleteId);
      toast.success('Curso eliminado.');
      setDeleteId(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar el curso.');
    }
  };

  if (!canRead) {
    return (
      <AppLayout>
        <Breadcrumb items={[{ label: 'Panel de control', path: '/dashboard' }, { label: 'Entrenamiento' }]} />
        <div className="p-8 text-center text-muted-foreground">
          No tienes permiso para ver los cursos de entrenamiento.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Entrenamiento' },
          { label: 'Cursos' },
        ]}
      />

      <PageContainer width="wide" className="px-4">
        <PageHeader
          icon={<GraduationCap />}
          title="Cursos de Entrenamiento"
          subtitle="Crea cursos profesionales, agrega lecciones y cuestionarios, y asígnalos a tus vigilantes."
          actions={canCreate ? (
            <Button
              variant="brand"
              onClick={() => { setForm(emptyForm); setOpenForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo curso
            </Button>
          ) : undefined}
        />

        <Stagger className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Cursos" value={courses.length} icon={<BookOpen />} accent="primary" />
          <StatCard label="Publicados" value={publishedCount} icon={<CheckCircle2 />} accent="green" />
          <StatCard label="Borradores" value={draftCount} icon={<Pencil />} accent="orange" />
        </Stagger>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cursos"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {TRAINING_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Section icon={<BookOpen />} title="Catálogo de cursos" contentClassName="overflow-hidden rounded-xl border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 font-semibold">Curso</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Nivel</th>
                <th className="px-4 py-3 font-semibold">Puntos</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="p-4"><SkeletonCards count={4} /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-10">
                  <EmptyState
                    icon={<GraduationCap />}
                    title="No se encontraron cursos"
                    description="Crea tu primer curso de entrenamiento para tus vigilantes."
                    action={canCreate ? (
                      <Button variant="brand" onClick={() => { setForm(emptyForm); setOpenForm(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Nuevo curso
                      </Button>
                    ) : undefined}
                  />
                </td></tr>
              )}
              {!loading && filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/training/courses/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium max-w-[260px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{c.title}</span>
                      {c.isAddon && (
                        <Badge variant="outline" className="shrink-0 gap-1">
                          <Lock className="h-3 w-3" /> Addon
                        </Badge>
                      )}
                    </div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{categoryLabel(c.category)}</td>
                  <td className="px-4 py-3">{levelLabel(c.level)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-primary" /> {c.pointsValue ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.published
                      ? <StatusBadge tone="green">Publicado</StatusBadge>
                      : <StatusBadge tone="slate">Borrador</StatusBadge>}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-muted">
                          <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate(`/training/courses/${c.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Abrir / Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/training/courses/${c.id}/enrollments`)}>
                          <Users className="mr-2 h-4 w-4" /> Progreso de vigilantes
                        </DropdownMenuItem>
                        {canDestroy && !c.isAddon && (
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </PageContainer>

      {/* Create dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo curso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Primeros auxilios en seguridad" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRAINING_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRAINING_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Puntos al completar</Label>
                <Input type="number" min={0} value={form.pointsValue ?? 0} onChange={(e) => setForm({ ...form, pointsValue: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Puntaje para aprobar (%)</Label>
                <Input type="number" min={0} max={100} value={form.passingScore ?? 70} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="brand" disabled={saving} onClick={handleCreate}>
              {saving ? 'Creando...' : 'Crear curso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción archivará el curso. Las inscripciones y certificados existentes se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
