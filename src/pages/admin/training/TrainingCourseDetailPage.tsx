import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import {
  trainingCourseService,
  type TrainingCourse,
  type TrainingLesson,
} from '@/lib/api/trainingCourseService';
import { TRAINING_CATEGORIES, TRAINING_LEVELS } from './trainingConstants';
import LessonsManager from './components/LessonsManager';
import QuizManager from './components/QuizManager';
import AssignGuardsPanel from './components/AssignGuardsPanel';

const GOLD = '#C8860A';

export default function TrainingCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('trainingCourseEdit');
  const canAssign = hasPermission('trainingEnrollmentCreate');

  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // editable metadata
  const [meta, setMeta] = useState({
    title: '',
    description: '',
    coverUrl: '',
    category: 'security',
    level: 'beginner',
    pointsValue: 0,
    passingScore: 70,
    certificateTemplate: '',
    published: false,
  });

  const isAddon = !!course?.isAddon;
  const readOnly = isAddon || !canEdit;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await trainingCourseService.get(id);
      setCourse(c);
      setLessons(c.lessons ?? []);
      setMeta({
        title: c.title ?? '',
        description: c.description ?? '',
        coverUrl: c.coverUrl ?? '',
        category: c.category ?? 'security',
        level: c.level ?? 'beginner',
        pointsValue: c.pointsValue ?? 0,
        passingScore: c.passingScore ?? 70,
        certificateTemplate: c.certificateTemplate ?? '',
        published: !!c.published,
      });
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el curso.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveMeta = async () => {
    if (!id) return;
    if (!meta.title.trim()) {
      toast.error('El título es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await trainingCourseService.update(id, {
        title: meta.title,
        description: meta.description,
        coverUrl: meta.coverUrl,
        category: meta.category as any,
        level: meta.level as any,
        pointsValue: Number(meta.pointsValue),
        passingScore: Number(meta.passingScore),
        certificateTemplate: meta.certificateTemplate,
        published: meta.published,
      });
      toast.success('Curso actualizado.');
      load();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar el curso.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Cargando...</div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Curso no encontrado.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Entrenamiento', path: '/training/courses' },
          { label: 'Cursos', path: '/training/courses' },
          { label: course.title },
        ]}
      />

      <section className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{course.title}</h1>
              {isAddon && (
                <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Curso addon</Badge>
              )}
              {course.published ? <Badge>Publicado</Badge> : <Badge variant="secondary">Borrador</Badge>}
            </div>
            {isAddon && (
              <p className="text-xs text-muted-foreground mt-1">
                Curso de la plataforma otorgado a tu empresa. Es de solo lectura; puedes asignarlo a tus guardias.
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate('/training/courses')}>Volver</Button>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="lessons">Lecciones ({lessons.length})</TabsTrigger>
            <TabsTrigger value="quiz">Cuestionario</TabsTrigger>
            {canAssign && <TabsTrigger value="assign">Asignar</TabsTrigger>}
          </TabsList>

          {/* DETAILS */}
          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input disabled={readOnly} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea disabled={readOnly} rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>URL de portada</Label>
                  <Input disabled={readOnly} value={meta.coverUrl} onChange={(e) => setMeta({ ...meta, coverUrl: e.target.value })} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={meta.category} onValueChange={(v) => setMeta({ ...meta, category: v })} disabled={readOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRAINING_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nivel</Label>
                    <Select value={meta.level} onValueChange={(v) => setMeta({ ...meta, level: v })} disabled={readOnly}>
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
                    <Input type="number" min={0} disabled={readOnly} value={meta.pointsValue} onChange={(e) => setMeta({ ...meta, pointsValue: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Puntaje para aprobar (%)</Label>
                    <Input type="number" min={0} max={100} disabled={readOnly} value={meta.passingScore} onChange={(e) => setMeta({ ...meta, passingScore: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plantilla de certificado (HTML opcional)</Label>
                  <Textarea
                    disabled={readOnly}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder="Usa {{guardName}}, {{courseTitle}}, {{score}}, {{serialNumber}}, {{issuedAt}}. Déjalo vacío para usar el certificado de marca C-Guard Pro."
                    value={meta.certificateTemplate}
                    onChange={(e) => setMeta({ ...meta, certificateTemplate: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="cursor-pointer">Publicado</Label>
                    <p className="text-xs text-muted-foreground">Los cursos publicados pueden asignarse a los guardias.</p>
                  </div>
                  <Switch checked={meta.published} disabled={readOnly} onCheckedChange={(v) => setMeta({ ...meta, published: v })} />
                </div>
                {!readOnly && (
                  <div className="flex justify-end">
                    <Button className="text-white" style={{ backgroundColor: GOLD }} disabled={saving} onClick={saveMeta}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LESSONS */}
          <TabsContent value="lessons" className="mt-4">
            <LessonsManager
              courseId={course.id}
              lessons={lessons}
              readOnly={readOnly}
              onChange={load}
            />
          </TabsContent>

          {/* QUIZ */}
          <TabsContent value="quiz" className="mt-4">
            <QuizManager
              courseId={course.id}
              quiz={course.quiz ?? null}
              passingScore={course.passingScore ?? 70}
              readOnly={readOnly}
              onChange={load}
            />
          </TabsContent>

          {/* ASSIGN */}
          {canAssign && (
            <TabsContent value="assign" className="mt-4">
              <AssignGuardsPanel courseId={course.id} published={!!course.published} />
            </TabsContent>
          )}
        </Tabs>
      </section>
    </AppLayout>
  );
}
