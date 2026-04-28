import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ApiService, ApiError } from "@/services/api/apiService";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/table/DataTable";
import { RowActionsMenu, type RowAction } from "@/components/table/RowActionsMenu";
import { BulkActionsSelect, type BulkAction } from "@/components/table/BulkActionsSelect";
import { Plus, Search, Eye, Trash, Filter, EllipsisVertical, FileDown, FileSpreadsheet } from "lucide-react";
import { userService } from "@/lib/api/userService";

type MemoItem = {
  id: string;
  subject: string;
  content?: string;
  dateTime?: string;
  wasAccepted?: boolean;
  guardName?: { name?: string } | string;
  guardNameId?: string | null;
  createdBy?: { name?: string } | string;
  createdById?: string | null;
};

export default function MemosPage() {
  const [loading, setLoading] = useState(false);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [query, setQuery] = useState("");

  const normalizePerson = (person: any) => {
    if (!person) return '-';
    if (typeof person === 'string') return person;
    return person.name || person.fullName || person.guardName || '-';
  };
  const [filters, setFilters] = useState<{ status?: "all" | "accepted" | "pending"; guardId?: string; createdById?: string; }>({ status: "all" });
  const [openFilter, setOpenFilter] = useState(false);
  const [createdByUsers, setCreatedByUsers] = useState<{ id: string; name: string }[]>([]);
  const [bulkKey, setBulkKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMemo, setViewMemo] = useState<MemoItem | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [memoToDelete, setMemoToDelete] = useState<MemoItem | null>(null);
  const [guards, setGuards] = useState<{ id: string; name: string }[]>([]);
  const [guardId, setGuardId] = useState<string>("");
  const [wasAccepted, setWasAccepted] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) throw new Error("Tenant no configurado");
        const res = await ApiService.get(`/tenant/${tenantId}/memos`);
        const rows = Array.isArray(res) ? res : res.rows || [];
        const mapped = rows.map((memo: any) => ({
          id: memo.id ?? memo._id ?? String(memo.id),
          subject: memo.subject || memo.title || "Sin asunto",
          content: memo.content || memo.description || "",
          dateTime: memo.dateTime || memo.createdAt || memo.updatedAt || "",
          wasAccepted: memo.wasAccepted || false,
          guardName: normalizePerson(memo.guardName),
          guardNameId: memo.guardName?.id || memo.guardNameId || memo.guardName || null,
          createdBy: normalizePerson(memo.createdBy),
          createdById: memo.createdBy?.id || memo.createdById || null,
        }));
        if (mounted) setMemos(mapped);
      } catch (err) {
        console.error('Error cargando memos:', err);
        toast.error('No se pudieron cargar los memos');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    const loadGuards = async () => {
      try {
        const tenantId = localStorage.getItem("tenantId") || "";
        if (!tenantId) return;
        const res = await ApiService.get(`/tenant/${tenantId}/security-guard?limit=200&offset=0`);
        const rows = Array.isArray(res) ? res : res.rows || res.data?.rows || [];
        const mappedGuards = rows
          .map((guard: any) => ({
            id: guard.id || guard.securityGuardId || guard.guardId,
            name: guard.fullName || guard.name || guard.guardName || `${guard.firstName || ''} ${guard.lastName || ''}`.trim(),
          }))
          .filter((guard: any) => guard.id);
        if (mounted) setGuards(mappedGuards);
      } catch (err) {
        console.error('Error cargando guardias:', err);
      }
    };

    const loadCreatedByUsers = async () => {
      try {
        const users = await userService.listUsersByRoles([
          'admin',
          'securitySupervisor',
          'supervisor',
        ]);
        const mappedUsers = users
          .map((user: any) => ({
            id: user.id || user._id || user.userId,
            name: user.fullName || user.name || user.email || user.username || user.id,
          }))
          .filter((user: any) => user.id);
        if (mounted) setCreatedByUsers(mappedUsers);
      } catch (err) {
        console.error('Error cargando usuarios:', err);
      }
    };

    loadGuards();
    loadCreatedByUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const queryValue = query.trim().toLowerCase();

    return memos.filter((memo) => {
      const memoText = [
        memo.subject,
        memo.content,
        normalizePerson(memo.guardName),
        normalizePerson(memo.createdBy),
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !queryValue || memoText.includes(queryValue);
      const matchesGuard = !filters.guardId || String(memo.guardNameId || '') === String(filters.guardId);
      const matchesCreatedBy = !filters.createdById || String(memo.createdById || '') === String(filters.createdById);
      const matchesStatus =
        filters.status === "all"
          ? true
          : filters.status === "accepted"
          ? memo.wasAccepted
          : !memo.wasAccepted;

      return matchesQuery && matchesGuard && matchesCreatedBy && matchesStatus;
    });
  }, [memos, query, filters]);

  const sortedMemos = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const aValue = String((a as any)[sortKey] ?? "").toLowerCase();
      const bValue = String((b as any)[sortKey] ?? "").toLowerCase();
      if (aValue === bValue) return 0;
      return sortDir === "asc" ? (aValue < bValue ? -1 : 1) : aValue > bValue ? -1 : 1;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sortedMemos.map((memo) => memo.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const handleCreate = async () => {
    if (!subject.trim()) {
      toast.error('El asunto es obligatorio');
      return;
    }

    if (!guardId) {
      toast.error('Selecciona la guardia para el memo');
      return;
    }

    setSaving(true);
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant no configurado");
      const payload = {
        subject: subject.trim(),
        content: content.trim(),
        dateTime: new Date().toISOString(),
        guardName: guardId,
        wasAccepted,
      };
      const res = await ApiService.post(`/tenant/${tenantId}/memos`, { data: payload });
      const newMemo: MemoItem = {
        id: res.id ?? String(Date.now()),
        subject: res.subject || payload.subject,
        content: res.content || payload.content,
        dateTime: res.dateTime || payload.dateTime,
        wasAccepted: res.wasAccepted ?? payload.wasAccepted,
        guardName: normalizePerson(res.guardName),
        guardNameId: res.guardName?.id || res.guardNameId || guardId || null,
        createdBy: normalizePerson(res.createdBy),
        createdById: res.createdBy?.id || res.createdById || null,
      };
      setMemos((current) => [newMemo, ...current]);
      setCreateOpen(false);
      setSubject("");
      setContent("");
      setGuardId("");
      setWasAccepted(false);
      toast.success('Memo creado correctamente');
    } catch (err) {
      let message = 'Error creando memo';
      if (err instanceof ApiError) {
        message = err.message || message;
      } else if (err && (err as any).message) {
        message = (err as any).message;
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (memo: MemoItem) => {
    setMemoToDelete(memo);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!memoToDelete) return;

    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant no configurado");
      await ApiService.delete(`/tenant/${tenantId}/memos/${memoToDelete.id}`);
      setMemos((current) => current.filter((item) => item.id !== memoToDelete.id));
      setSelectedIds((prev) => prev.filter((id) => id !== memoToDelete.id));
      toast.success('Memo eliminado correctamente');
    } catch (err) {
      let message = 'Error eliminando memo';
      if (err instanceof ApiError) {
        message = err.message || message;
      } else if (err && (err as any).message) {
        message = (err as any).message;
      }
      toast.error(message);
    } finally {
      setConfirmDeleteOpen(false);
      setMemoToDelete(null);
    }
  };

  const handleView = (memo: MemoItem) => {
    setViewMemo(memo);
    setViewOpen(true);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedIds.length) {
      toast.error('Selecciona al menos un memo para exportar');
      return;
    }

    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant no configurado");
      const idsParam = selectedIds.map(encodeURIComponent).join(',');
      const blob = await ApiService.getBlob(`/tenant/${tenantId}/memos/export?format=${format}&ids=${idsParam}`);
      const filename = `memos_${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      downloadBlob(blob, filename);
      toast.success(`Exportado a ${format === 'pdf' ? 'PDF' : 'Excel'} correctamente`);
    } catch (err) {
      let message = `Error exportando a ${format === 'pdf' ? 'PDF' : 'Excel'}`;
      if (err instanceof ApiError) {
        message = err.message || message;
      } else if (err && (err as any).message) {
        message = (err as any).message;
      }
      toast.error(message);
    }
  };

  const handleExportPDF = async () => handleExport('pdf');
  const handleExportExcel = async () => handleExport('excel');

  const handleBulkAction = async (value: string) => {
    if (value !== 'deleteSelected') return;
    if (!selectedIds.length) {
      toast.error('Selecciona al menos un memo.');
      return;
    }

    if (!window.confirm(`¿Eliminar ${selectedIds.length} memo(s)?`)) return;
    try {
      const tenantId = localStorage.getItem("tenantId") || "";
      if (!tenantId) throw new Error("Tenant no configurado");
      await Promise.all(selectedIds.map((id) => ApiService.delete(`/tenant/${tenantId}/memos/${id}`)));
      setMemos((current) => current.filter((memo) => !selectedIds.includes(memo.id)));
      setSelectedIds([]);
      setBulkKey((prev) => prev + 1);
      toast.success('Memos eliminados correctamente');
    } catch (err) {
      let message = 'Error eliminando memos';
      if (err instanceof ApiError) {
        message = err.message || message;
      } else if (err && (err as any).message) {
        message = (err as any).message;
      }
      toast.error(message);
    }
  };

  const bulkActions: BulkAction[] = [
    { value: 'deleteSelected', label: 'Eliminar seleccionados' },
  ];

  const columns: Column<MemoItem>[] = [
    { key: 'subject', header: 'Asunto', sortable: true },
    { key: 'guardName', header: 'Guardia', sortable: true },
    { key: 'createdBy', header: 'Creado por', sortable: true },
    {
      key: 'dateTime',
      header: 'Fecha',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      key: 'wasAccepted',
      header: 'Estado',
      sortable: true,
      render: (value) => value ? 'Aceptado' : 'Pendiente',
    },
  ];

  const rowActions = (memo: MemoItem): RowAction[] => [
    {
      label: 'Ver',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => handleView(memo),
    },
    {
      label: 'Eliminar',
      icon: <Trash className="h-4 w-4" />,
      destructive: true,
      onClick: () => handleDelete(memo),
    },
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Memos</h1>
            <p className="mt-1 text-sm text-slate-500">Lista de memos del equipo de seguridad.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-[#C8860A] hover:bg-[#B37809] text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Memo
            </Button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <BulkActionsSelect key={bulkKey} actions={bulkActions} onChange={handleBulkAction} />
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar memo..."
                  className="pl-10 w-full"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Sheet open={openFilter} onOpenChange={setOpenFilter}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30">
                    <Filter className="mr-2 h-4 w-4" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[400px] md:w-[460px] h-full sm:h-auto">
                  <SheetHeader>
                    <SheetTitle>Filtros de memo</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Guardia</Label>
                      <Select
                        value={filters.guardId ?? undefined}
                        onValueChange={(value) => setFilters({ ...filters, guardId: value === 'all' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {guards.map((guard) => (
                            <SelectItem key={guard.id} value={guard.id}>
                              {guard.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Creado por</Label>
                      <Select
                        value={filters.createdById ?? undefined}
                        onValueChange={(value) => setFilters({ ...filters, createdById: value === 'all' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {createdByUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select
                        value={filters.status || 'all'}
                        onValueChange={(value) => setFilters({ ...filters, status: value as 'all' | 'accepted' | 'pending' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="accepted">Aceptados</SelectItem>
                          <SelectItem value="pending">Pendientes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full bg-[#C8860A] hover:bg-[#B37809] text-white"
                      onClick={() => setOpenFilter(false)}
                    >
                      Aplicar filtros
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setFilters({ status: 'all' });
                        setOpenFilter(false);
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <EllipsisVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <DataTable<MemoItem>
            columns={columns}
            data={sortedMemos}
            loading={loading}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            rowActions={rowActions}
            sortKey={sortKey ?? undefined}
            sortDir={sortDir ?? undefined}
            onSortChange={(key, dir) => {
              setSortKey(dir ? key : null);
              setSortDir(dir);
            }}
            emptyState={
              <div className="flex flex-col items-center justify-center text-center py-16">
                <p className="text-base font-medium">No se encontraron memos</p>
                <p className="mt-1 text-sm text-slate-500">Ajusta la búsqueda o crea un nuevo memo.</p>
              </div>
            }
          />
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nuevo Memo</DialogTitle>
              <DialogDescription>
                Crea un memo rápido para el equipo de seguridad.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Guardia</label>
                <Select value={guardId} onValueChange={(value) => setGuardId(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una guardia" />
                  </SelectTrigger>
                  <SelectContent>
                    {guards.map((guard) => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Estado</label>
                <Select value={wasAccepted ? 'accepted' : 'pending'} onValueChange={(value) => setWasAccepted(value === 'accepted')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="accepted">Aceptado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Asunto</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Descripción corta del memo" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Contenido</label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Detalles del memo" />
              </div>
            </div>
            <DialogFooter className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button className="bg-[#C8860A] hover:bg-[#B37809] text-white" onClick={handleCreate} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Memo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar el memo "{memoToDelete?.subject}"?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setMemoToDelete(null)}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
                Eliminar memo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Detalle del Memo</DialogTitle>
              <DialogDescription>Revisa la información del memo seleccionado.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Asunto</h3>
                <p className="mt-1 text-sm text-slate-900">{viewMemo?.subject || '-'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Guardia</h3>
                <p className="mt-1 text-sm text-slate-900">{typeof viewMemo?.guardName === 'string' ? viewMemo?.guardName : viewMemo?.guardName?.name || '-'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Creado por</h3>
                <p className="mt-1 text-sm text-slate-900">{typeof viewMemo?.createdBy === 'string' ? viewMemo?.createdBy : viewMemo?.createdBy?.name || '-'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Fecha</h3>
                <p className="mt-1 text-sm text-slate-900">{viewMemo?.dateTime ? new Date(viewMemo.dateTime).toLocaleString() : '-'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Contenido</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-900">{viewMemo?.content || '-'}</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
