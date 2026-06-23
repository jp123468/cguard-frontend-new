import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { securityGuardService } from '@/lib/api/securityGuardService';
import {
  trainingEnrollmentService,
  type EnrollmentRow,
} from '@/lib/api/trainingEnrollmentService';
import { ENROLLMENT_STATUS_LABELS, ENROLLMENT_STATUS_VARIANT } from '../trainingConstants';

const GOLD = '#C8860A';

interface GuardOption {
  id: string;
  name: string;
}

function extractGuard(g: any): GuardOption | null {
  const id = g.id || g.guardId || g.securityGuardId || g.userId;
  if (!id) return null;
  const name =
    g.fullName ||
    g.guardName ||
    g.displayName ||
    g.name ||
    `${g.firstName ?? g.firstname ?? ''} ${g.lastName ?? g.lastname ?? ''}`.trim() ||
    'Sin nombre';
  return { id, name };
}

interface Props {
  courseId: string;
  published: boolean;
}

export default function AssignGuardsPanel({ courseId, published }: Props) {
  const [assignmentType, setAssignmentType] = useState<'individual' | 'all_guards'>('individual');
  const [dueDate, setDueDate] = useState('');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<GuardOption[]>([]);
  const [selected, setSelected] = useState<GuardOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadEnrollments = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await trainingEnrollmentService.listByCourse(courseId, { limit: 100, offset: 0 });
      setEnrollments(res.rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, [courseId]);

  useEffect(() => { loadEnrollments(); }, [loadEnrollments]);

  useEffect(() => {
    if (assignmentType !== 'individual') return;
    const q = query.trim();
    if (q.length < 2) { setOptions([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res: any = await securityGuardService.autocomplete(q, 10);
        const rows: any[] = Array.isArray(res) ? res : res?.rows ?? res?.data ?? [];
        if (active) setOptions(rows.map(extractGuard).filter(Boolean) as GuardOption[]);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [query, assignmentType]);

  const handleAssign = async () => {
    if (!published) {
      toast.error('Publica el curso antes de asignarlo.');
      return;
    }
    if (assignmentType === 'individual' && !selected) {
      toast.error('Selecciona un vigilante.');
      return;
    }
    setAssigning(true);
    try {
      await trainingEnrollmentService.enroll(courseId, {
        assignmentType,
        securityGuardId: assignmentType === 'individual' ? selected!.id : undefined,
        dueDate: dueDate || undefined,
      });
      toast.success(assignmentType === 'all_guards' ? 'Curso asignado a todos los vigilantes.' : `Curso asignado a ${selected!.name}.`);
      setSelected(null);
      setQuery('');
      setDueDate('');
      loadEnrollments();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.message;
      toast.error(msg || 'No se pudo asignar el curso.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4 max-w-2xl">
          {!published && (
            <p className="text-sm text-amber-600">Este curso es un borrador. Publícalo para poder asignarlo.</p>
          )}
          <div className="space-y-2">
            <Label>Tipo de asignación</Label>
            <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as any)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Vigilante específico</SelectItem>
                <SelectItem value="all_guards">Todos los vigilantes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === 'individual' && (
            <div className="space-y-2">
              <Label>Buscar vigilante</Label>
              {selected ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> {selected.name}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Cambiar</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Nombre del vigilante" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {(options.length > 0 || searching) && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow">
                      {searching && <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>}
                      {options.map((o) => (
                        <button
                          key={o.id}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => { setSelected(o); setOptions([]); }}
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Fecha límite (opcional)</Label>
            <Input type="date" className="w-64" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <Button className="text-white" style={{ backgroundColor: GOLD }} disabled={assigning || !published} onClick={handleAssign}>
            <UserPlus className="h-4 w-4 mr-1" /> {assigning ? 'Asignando...' : 'Asignar curso'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-2">Vigilantes asignados</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 font-semibold">Vigilante</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Progreso</th>
                <th className="px-4 py-3 font-semibold">Cuestionario</th>
                <th className="px-4 py-3 font-semibold">Completado</th>
              </tr>
            </thead>
            <tbody>
              {loadingList && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>}
              {!loadingList && enrollments.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Aún no hay vigilantes asignados</td></tr>
              )}
              {!loadingList && enrollments.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="px-4 py-3">
                    {e.assignmentType === 'all_guards' && !e.guardId
                      ? <Badge variant="outline">Todos los vigilantes (plantilla)</Badge>
                      : (e.guardName || '-')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ENROLLMENT_STATUS_VARIANT[e.status]}>{ENROLLMENT_STATUS_LABELS[e.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{e.progressPercentage ?? 0}%</td>
                  <td className="px-4 py-3">
                    {e.quizPassed
                      ? <Badge variant="default">Aprobado{e.quizScore != null ? ` (${e.quizScore}%)` : ''}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
