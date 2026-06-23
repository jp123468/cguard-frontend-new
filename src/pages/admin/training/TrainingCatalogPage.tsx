import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, GraduationCap, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { trainingCourseService, type TrainingCourse } from '@/lib/api/trainingCourseService';
import { categoryLabel, levelLabel } from './trainingConstants';

const GOLD = '#C8860A';

export default function TrainingCatalogPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission('trainingCourseRead');
  const canAssign = hasPermission('trainingEnrollmentCreate');

  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingCourseService.list({}, { limit: 200, offset: 0 });
      setCourses(res.rows.filter((c) => c.isAddon));
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  if (!canRead) {
    return (
      <AppLayout>
        <Breadcrumb items={[{ label: 'Panel de control', path: '/dashboard' }, { label: 'Entrenamiento' }]} />
        <div className="p-8 text-center text-muted-foreground">No tienes permiso para ver el catálogo.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Entrenamiento', path: '/training/courses' },
          { label: 'Catálogo de la plataforma' },
        ]}
      />

      <section className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-6 w-6" style={{ color: GOLD }} />
          <h1 className="text-xl font-semibold">Cursos de la plataforma</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Cursos addon otorgados a tu empresa por C-Guard Pro. Son de solo lectura, pero puedes asignarlos a tus vigilantes.
        </p>

        {loading && <div className="py-16 text-center text-muted-foreground">Cargando...</div>}
        {!loading && courses.length === 0 && (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            Tu empresa aún no tiene cursos addon otorgados.
          </CardContent></Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading && courses.map((c) => (
            <Card key={c.id} className="flex flex-col">
              {c.coverUrl && (
                <div className="h-32 w-full bg-muted overflow-hidden rounded-t-lg">
                  <img src={c.coverUrl} alt={c.title} className="h-full w-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <Badge variant="outline" className="shrink-0 gap-1"><Lock className="h-3 w-3" /> Addon</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {c.description && <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  <Badge variant="secondary">{categoryLabel(c.category)}</Badge>
                  <Badge variant="secondary">{levelLabel(c.level)}</Badge>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Award className="h-3.5 w-3.5" style={{ color: GOLD }} /> {c.pointsValue ?? 0} pts
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/training/courses/${c.id}`)}>
                    Ver
                  </Button>
                  {canAssign && (
                    <Button
                      size="sm"
                      className="flex-1 text-white"
                      style={{ backgroundColor: GOLD }}
                      onClick={() => navigate(`/training/courses/${c.id}`)}
                    >
                      <Users className="h-4 w-4 mr-1" /> Asignar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
