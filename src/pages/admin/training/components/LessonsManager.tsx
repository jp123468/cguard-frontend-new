import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Video, FileText, Paperclip, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  trainingCourseService,
  type TrainingLesson,
  type TrainingResource,
  type TrainingLessonInput,
} from '@/lib/api/trainingCourseService';

const GOLD = '#C8860A';

interface Props {
  courseId: string;
  lessons: TrainingLesson[];
  readOnly: boolean;
  onChange: () => void;
}

interface LessonForm {
  title: string;
  description: string;
  videoUrl: string;
  richContent: string;
  durationMinutes: string;
  resources: TrainingResource[];
}

const emptyLesson: LessonForm = {
  title: '',
  description: '',
  videoUrl: '',
  richContent: '',
  durationMinutes: '',
  resources: [],
};

export default function LessonsManager({ courseId, lessons, readOnly, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingLesson | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyLesson);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const openNew = () => {
    setEditing(null);
    setForm(emptyLesson);
    setOpen(true);
  };

  const openEdit = (l: TrainingLesson) => {
    setEditing(l);
    setForm({
      title: l.title ?? '',
      description: l.description ?? '',
      videoUrl: l.videoUrl ?? '',
      richContent: l.richContent ?? '',
      durationMinutes: l.durationMinutes != null ? String(l.durationMinutes) : '',
      resources: Array.isArray(l.resources) ? l.resources : [],
    });
    setOpen(true);
  };

  const addResource = () => setForm((f) => ({ ...f, resources: [...f.resources, { name: '', url: '', type: 'pdf' }] }));
  const updateResource = (i: number, patch: Partial<TrainingResource>) =>
    setForm((f) => ({ ...f, resources: f.resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  const removeResource = (i: number) =>
    setForm((f) => ({ ...f, resources: f.resources.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('El título de la lección es obligatorio.');
      return;
    }
    const payload: TrainingLessonInput = {
      title: form.title,
      description: form.description || undefined,
      videoUrl: form.videoUrl || undefined,
      richContent: form.richContent || undefined,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      resources: form.resources.filter((r) => r.url && r.name),
    };
    setSaving(true);
    try {
      if (editing) {
        await trainingCourseService.updateLesson(editing.id, payload);
        toast.success('Lección actualizada.');
      } else {
        await trainingCourseService.createLesson(courseId, payload);
        toast.success('Lección agregada.');
      }
      setOpen(false);
      onChange();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar la lección.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await trainingCourseService.removeLesson(deleteId);
      toast.success('Lección eliminada.');
      setDeleteId(null);
      onChange();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar la lección.');
    }
  };

  const move = async (l: TrainingLesson, dir: -1 | 1) => {
    const idx = sorted.findIndex((x) => x.id === l.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        trainingCourseService.updateLesson(l.id, { order: swap.order }),
        trainingCourseService.updateLesson(swap.id, { order: l.order }),
      ]);
      onChange();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo reordenar.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Lecciones ordenadas que verán los guardias.</p>
        {!readOnly && (
          <Button className="text-white" style={{ backgroundColor: GOLD }} onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Agregar lección
          </Button>
        )}
      </div>

      {sorted.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay lecciones todavía.</CardContent></Card>
      )}

      {sorted.map((l, idx) => (
        <Card key={l.id}>
          <CardContent className="py-4 flex items-start gap-3">
            <div className="flex flex-col items-center pt-1 text-muted-foreground">
              {!readOnly ? (
                <div className="flex flex-col">
                  <button className="hover:text-foreground disabled:opacity-30" disabled={idx === 0} onClick={() => move(l, -1)}>▲</button>
                  <GripVertical className="h-4 w-4 my-0.5" />
                  <button className="hover:text-foreground disabled:opacity-30" disabled={idx === sorted.length - 1} onClick={() => move(l, 1)}>▼</button>
                </div>
              ) : (
                <span className="text-sm font-semibold">{idx + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{idx + 1}. {l.title}</div>
              {l.description && <div className="text-sm text-muted-foreground mt-0.5">{l.description}</div>}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {l.videoUrl && <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Video</span>}
                {l.richContent && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Texto</span>}
                {Array.isArray(l.resources) && l.resources.length > 0 && (
                  <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {l.resources.length} recurso(s)</span>
                )}
                {l.durationMinutes != null && <span>{l.durationMinutes} min</span>}
              </div>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-muted" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></button>
                <button className="p-1.5 rounded hover:bg-muted text-red-600" onClick={() => setDeleteId(l.id)}><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Lesson form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar lección' : 'Nueva lección'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>URL de video (YouTube, Vimeo, etc.)</Label>
              <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Contenido (texto enriquecido / HTML)</Label>
              <Textarea rows={5} value={form.richContent} onChange={(e) => setForm({ ...form, richContent: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Duración (minutos)</Label>
              <Input type="number" min={0} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recursos (PDF, documentos)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addResource}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
              </div>
              {form.resources.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Nombre" value={r.name} onChange={(e) => updateResource(i, { name: e.target.value })} />
                  <Input placeholder="URL" value={r.url} onChange={(e) => updateResource(i, { url: e.target.value })} />
                  <button className="p-1.5 text-red-600" onClick={() => removeResource(i)}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="text-white" style={{ backgroundColor: GOLD }} disabled={saving} onClick={handleSave}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lección?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
