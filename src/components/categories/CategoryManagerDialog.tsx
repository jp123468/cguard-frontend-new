import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { categoryService, type Category } from "@/lib/api/categoryService";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { clientService } from "@/lib/api/clientService";
import { usePermissions } from '@/hooks/usePermissions';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string; // e.g., "clientAccount"
  onChanged?: () => void; // notify parent to refresh
};

export function CategoryManagerDialog({ open, onOpenChange, module, onChanged }: Props) {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 400);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inUseInfo, setInUseInfo] = useState<{ id: string; name: string; count: number } | null>(null);
  const { hasPermission } = usePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryService.list({
        filter: { module, name: debounced || undefined },
        limit: 1000,
        offset: 0,
      });
      setItems(res.rows);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debounced, module]);

  const startCreate = () => {
    if (!hasPermission('categoryCreate')) {
      toast.error('No tienes permiso para crear categorías');
      return;
    }
    setNewName("");
    setNewDesc("");
    setCreating(true);
  };

  const submitCreate = async () => {
    if (!hasPermission('categoryCreate')) {
      toast.error('No tienes permiso para crear categorías');
      return;
    }
    if (!newName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    try {
      const created = await categoryService.create({ name: newName.trim(), description: newDesc.trim() || undefined, module });
      toast.success("Categoría creada");
      setCreating(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Error al crear");
    }
  };

  const startEdit = (cat: Category) => {
    if (!hasPermission('categoryEdit')) {
      toast.error('No tienes permiso para editar categorías');
      return;
    }
    setEditing(cat);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  const attemptDelete = async (cat: Category) => {
    if (!hasPermission('categoryDestroy')) {
      toast.error('No tienes permiso para eliminar categorías');
      return;
    }
    try {
      // Pre-chequeo: ¿está en uso por algún cliente?
      const usedCount = await clientService.checkCategoryUsage(cat.id);
      console.log(`Verificando categoría ${cat.name} (${cat.id}): ${usedCount} usos encontrados`);
      if (usedCount > 0) {
        setInUseInfo({ id: cat.id, name: cat.name, count: usedCount });
        return;
      }
      setConfirmDeleteId(cat.id);
    } catch (e: any) {
      console.error("Error verificando uso de categoría:", e);
      // Si no podemos validar, mostramos confirmación igualmente, pero advertimos
      toast.warning("No se pudo verificar si la categoría está en uso. Proceda con precaución.");
      setConfirmDeleteId(cat.id);
    }
  };

  const submitEdit = async () => {
    if (!hasPermission('categoryEdit')) {
      toast.error('No tienes permiso para editar categorías');
      return;
    }
    if (!editing) return;
    if (!editName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    try {
      await categoryService.update(editing.id, { name: editName.trim(), description: editDesc.trim() || undefined, module });
      toast.success("Categoría actualizada");
      setEditing(null);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar");
    }
  };

  const removeConfirmed = async () => {
    if (!confirmDeleteId) return;
    if (!hasPermission('categoryDestroy')) {
      toast.error('No tienes permiso para eliminar categorías');
      setConfirmDeleteId(null);
      return;
    }
    try {
      await categoryService.delete([confirmDeleteId]);
      toast.success("Categoría eliminada");
      setConfirmDeleteId(null);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Categoría del Cliente</DialogTitle>
          <DialogDescription>
            Administra categorías para el módulo seleccionado. No se pueden eliminar categorías que estén en uso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar categoría" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {hasPermission('categoryCreate') && (
            <Button onClick={startCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
            </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Nombre de Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-20 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                      {loading ? "Cargando..." : "No se encontraron categorías"}
                    </TableCell>
                  </TableRow>
                )}

                {items.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.description || "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <EllipsisVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {hasPermission('categoryEdit') && (
                          <DropdownMenuItem onClick={() => startEdit(cat)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          )}
                          {hasPermission('categoryDestroy') && (
                          <DropdownMenuItem onClick={() => attemptDelete(cat)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Crear */}
          {creating && (
            <div className="border rounded-md p-4 space-y-3">
              <div className="font-medium">Nueva Categoría</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre*</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Descripción</label>
                  <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button onClick={submitCreate}>Guardar</Button>
              </div>
            </div>
          )}

          {/* Editar */}
          {editing && (
            <div className="border rounded-md p-4 space-y-3">
              <div className="font-medium">Editar Categoría</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre*</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Descripción</label>
                  <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={submitEdit}>Guardar</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={removeConfirmed} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!inUseInfo} onOpenChange={(open) => !open && setInUseInfo(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>No se puede eliminar</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="text-sm text-muted-foreground">
          La categoría "{inUseInfo?.name}" está en uso por {inUseInfo?.count} {inUseInfo && inUseInfo.count === 1 ? "registro" : "registros"}.
          Para eliminarla, primero reasigna o quita esta categoría de esos registros.
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setInUseInfo(null)}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default CategoryManagerDialog;
