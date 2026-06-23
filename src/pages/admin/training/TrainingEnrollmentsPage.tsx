import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { trainingCourseService, type TrainingCourse } from '@/lib/api/trainingCourseService';
import {
  trainingEnrollmentService,
  type EnrollmentRow,
  type EnrollmentDetail,
} from '@/lib/api/trainingEnrollmentService';
import { ENROLLMENT_STATUS_LABELS, ENROLLMENT_STATUS_VARIANT } from './trainingConstants';

const GOLD = '#C8860A';

export default function TrainingEnrollmentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission('trainingEnrollmentRead');

  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [detail, setDetail] = useState<EnrollmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [c, res] = await Promise.all([
        trainingCourseService.get(courseId),
        trainingEnrollmentService.listByCourse(courseId, {
          limit: 200,
          offset: 0,
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        }),
      ]);
      setCourse(c);
      setRows(res.rows);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el progreso.');
    } finally {
      setLoading(false);
    }
  }, [courseId, statusFilter]);

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  const openDetail = async (enrollmentId: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await trainingEnrollmentService.detail(enrollmentId);
      setDetail(d);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el detalle.');
    } finally {
      setDetailLoading(false);
    }
  };

  if (!canRead) {
    return (
      <AppLayout>
        <Breadcrumb items={[{ label: 'Panel de control', path: '/dashboard' }, { label: 'Entrenamiento' }]} />
        <div className="p-8 text-center text-muted-foreground">No tienes permiso para ver el progreso.</div>
      </AppLayout>
    );
  }

  const completedCount = rows.filter((r) => r.status === 'completed').length;
  const realEnrollments = rows.filter((r) => r.guardId || r.assignmentType === 'individual');

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Entrenamiento', path: '/training/courses' },
          { label: 'Cursos', path: '/training/courses' },
          { label: course?.title ?? 'Curso', path: courseId ? `/training/courses/${courseId}` : undefined },
          { label: 'Progreso' },
        ]}
      />

      <section className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-semibold">{course?.title ?? 'Progreso del curso'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} de {realEnrollments.length} vigilantes completaron el curso.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(ENROLLMENT_STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate(`/training/courses/${courseId}`)}>Editar curso</Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 font-semibold">Vigilante</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Progreso</th>
                <th className="px-4 py-3 font-semibold">Cuestionario</th>
                <th className="px-4 py-3 font-semibold">Fecha límite</th>
                <th className="px-4 py-3 font-semibold">Completado</th>
                <th className="px-4 py-3 font-semibold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">Cargando...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">No hay inscripciones</td></tr>
              )}
              {!loading && rows.map((r) => {
                const isTemplate = r.assignmentType === 'all_guards' && !r.guardId;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {isTemplate ? <Badge variant="outline">Todos los vigilantes (plantilla)</Badge> : (r.guardName || '-')}
                    </td>
                    <td className="px-4 py-3"><Badge variant={ENROLLMENT_STATUS_VARIANT[r.status]}>{ENROLLMENT_STATUS_LABELS[r.status]}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${r.progressPercentage ?? 0}%`, backgroundColor: GOLD }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{r.progressPercentage ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.quizPassed
                        ? <Badge variant="default">Aprobado{r.quizScore != null ? ` (${r.quizScore}%)` : ''}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {!isTemplate && (
                        <Button size="sm" variant="ghost" onClick={() => openDetail(r.id)}>Ver</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={!!detail || detailLoading} onOpenChange={(o) => { if (!o) { setDetail(null); } }}>
        <SheetContent side="right" className="w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle de progreso</SheetTitle>
          </SheetHeader>
          {detailLoading && <div className="mt-6 text-muted-foreground">Cargando...</div>}
          {detail && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-lg font-semibold">{detail.guardName}</div>
                <Badge variant={ENROLLMENT_STATUS_VARIANT[detail.status]} className="mt-1">{ENROLLMENT_STATUS_LABELS[detail.status]}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${detail.progressPercentage ?? 0}%`, backgroundColor: GOLD }} />
                </div>
                <span className="text-sm">{detail.progressPercentage ?? 0}%</span>
              </div>
              <div className="text-sm">
                Cuestionario:{' '}
                {detail.quizPassed
                  ? <span className="text-green-600 font-medium">Aprobado{detail.quizScore != null ? ` (${detail.quizScore}%)` : ''}</span>
                  : <span className="text-muted-foreground">No aprobado</span>}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Lecciones</h4>
                <div className="space-y-2">
                  {detail.lessonCompletions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aún no ha completado lecciones.</p>
                  )}
                  {detail.lessonCompletions.map((lc) => (
                    <div key={lc.lessonId} className="flex items-center gap-2 text-sm">
                      {lc.completedAt
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                        : <Clock className="h-4 w-4 text-muted-foreground" />}
                      <span className="flex-1">{lc.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {lc.completedAt ? new Date(lc.completedAt).toLocaleDateString() : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
