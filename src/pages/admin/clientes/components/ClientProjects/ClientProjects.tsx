import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, EllipsisVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { projectService, type ClientProject } from '@/lib/api/projectService';
import { ProjectTypeBadge, ProjectStatusBadge } from '@/components/projects/ProjectBadge';
import ProjectForm from '@/pages/admin/projects/ProjectForm';

interface Props {
  client: any;
}

export default function ClientProjects({ client }: Props) {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(false);

  // Create / Edit dialog
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>(undefined);

  const loadProjects = async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const { rows } = await projectService.listByClient(client.id);
      setProjects(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, [client?.id]);

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

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Proyectos</h2>
        <Button
          className="bg-[#C8860A] hover:bg-[#B37809] text-white"
          size="sm"
          onClick={() => { setEditingId(undefined); setOpenForm(true); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo proyecto
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Cargando...</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No hay proyectos para este cliente
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 font-semibold">Proyecto</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Inicio</th>
                <th className="px-4 py-3 font-semibold">Fin</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div>{p.name}</div>
                    {p.location && (
                      <div className="text-xs text-muted-foreground mt-0.5">{p.location}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ProjectTypeBadge value={p.type} />
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          </DialogHeader>
          <ProjectForm
            mode={editingId ? 'edit' : 'create'}
            projectId={editingId}
            defaultClientId={client?.id}
            onSaved={() => { setOpenForm(false); loadProjects(); }}
            onCancel={() => setOpenForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(undefined)}
      >
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
    </div>
  );
}
