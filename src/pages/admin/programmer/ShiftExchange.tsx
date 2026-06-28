import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirmDialog";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Filter, EllipsisVertical, FileText, FileSpreadsheet,
  Printer, Mail, ChevronsUpDown, X, Loader2, CheckCircle, XCircle, Trash2,
  ArrowLeftRight, Clock, ThumbsUp, ThumbsDown, Plus,
} from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { PageContainer, PageHeader, Section, StatCard, Stagger, StatusBadge, EmptyState } from "@/components/kit";
import shiftExchangeRequestService, { ShiftExchangeRecord } from "@/lib/api/shiftExchangeRequestService";
import { securityGuardService } from "@/lib/api/securityGuardService";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface GuardOption { userId: string; fullName: string; }

// ── component ────────────────────────────────────────────────────────────────

export default function ShiftExchange() {
  const [records, setRecords] = useState<ShiftExchangeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Guards for form
  const [guards, setGuards] = useState<GuardOption[]>([]);

  // Form state
  const [form, setForm] = useState({
    fromGuardId: "",
    toGuardId: "",
    fromShiftId: "",
    toShiftId: "",
    notes: "",
  });

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 500 };
      if (statusFilter !== "all") params["filter[status]"] = statusFilter;
      const { rows } = await shiftExchangeRequestService.list(params);
      setRecords(rows);
    } catch (err) {
      console.error("Failed to fetch shift exchange requests", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Load guards when form opens
  useEffect(() => {
    if (!isNewRequestOpen) return;
    if (guards.length > 0) return;
    (async () => {
      try {
        const resp: any = await securityGuardService.list({ limit: 200, offset: 0 } as any);
        const items: any[] = Array.isArray(resp) ? resp : (resp.rows ?? []);
        const opts: GuardOption[] = items
          .map((item: any) => {
            const userId = item.guard?.id ?? item.guardId ?? null;
            const fullName =
              item.fullName ??
              (item.guard?.firstName && item.guard?.lastName
                ? `${item.guard.firstName} ${item.guard.lastName}`
                : item.guard?.fullName ?? "");
            return userId ? { userId, fullName } : null;
          })
          .filter(Boolean) as GuardOption[];
        setGuards(opts);
      } catch (e) {
        console.error("Failed to load guards", e);
      }
    })();
  }, [isNewRequestOpen, guards.length]);

  // ── stats ─────────────────────────────────────────────────────────────────
  const stats = {
    pending: records.filter((r) => r.status === "pending").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };

  // ── filter + paginate ─────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();
  const filtered = records.filter((r) => {
    if (!q) return true;
    return (
      (r.fromGuard?.fullName ?? "").toLowerCase().includes(q) ||
      (r.toGuard?.fullName ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── handlers ──────────────────────────────────────────────────────────────
  const resetForm = () =>
    setForm({ fromGuardId: "", toGuardId: "", fromShiftId: "", toShiftId: "", notes: "" });

  const handleCreate = async () => {
    if (!form.fromGuardId) {
      toast.error("Por favor seleccione un vigilante solicitante");
      return;
    }
    setSaving(true);
    try {
      await shiftExchangeRequestService.create({
        fromGuardId: form.fromGuardId || undefined,
        toGuardId: form.toGuardId || undefined,
        fromShiftId: form.fromShiftId || undefined,
        toShiftId: form.toShiftId || undefined,
        notes: form.notes || undefined,
      });
      await fetchRecords();
      setIsNewRequestOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create shift exchange request", err);
      toast.error("Error al crear la solicitud. Inténtelo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await shiftExchangeRequestService.updateStatus(id, "approved");
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to approve", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await shiftExchangeRequestService.updateStatus(id, "rejected");
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to reject", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Eliminar solicitud', message: "¿Eliminar esta solicitud de intercambio?", confirmText: 'Eliminar', tone: 'danger' }))) return;
    try {
      await shiftExchangeRequestService.destroy(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <StatusBadge tone="orange">Pendiente</StatusBadge>;
      case "approved":
        return <StatusBadge tone="green">Aprobado</StatusBadge>;
      case "rejected":
        return <StatusBadge tone="red">Rechazado</StatusBadge>;
      default:
        return <StatusBadge tone="slate">{status}</StatusBadge>;
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Intercambio de Turno" },
        ]}
      />
      <PageContainer width="wide" className="px-4 lg:px-6">
        <PageHeader
          icon={<ArrowLeftRight />}
          title="Intercambio de Turnos"
          subtitle="Solicitudes de intercambio de turnos entre vigilantes."
        />

        {/* Stats */}
        <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pendientes" value={stats.pending} icon={<Clock />} accent="orange" />
          <StatCard label="Aprobadas" value={stats.approved} icon={<ThumbsUp />} accent="green" />
          <StatCard label="Rechazadas" value={stats.rejected} icon={<ThumbsDown />} accent="red" />
        </Stagger>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="w-full md:w-52">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar vigilante..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* New Request Sheet */}
              <Sheet open={isNewRequestOpen} onOpenChange={(v) => { setIsNewRequestOpen(v); if (!v) resetForm(); }}>
                <SheetTrigger asChild>
                  <Button variant="brand">
                    <Plus className="h-4 w-4 mr-1" /> Nueva solicitud
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader className="relative">
                    <SheetTitle>Nueva solicitud de intercambio</SheetTitle>
                    <Button variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setIsNewRequestOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="grid gap-6 py-6">
                    <div className="grid gap-2">
                      <Label>Vigilante solicitante*</Label>
                      <Select value={form.fromGuardId} onValueChange={(v) => setForm({ ...form, fromGuardId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {guards.map((g) => (
                            <SelectItem key={g.userId} value={g.userId}>{g.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Vigilante receptor (opcional)</Label>
                      <Select value={form.toGuardId} onValueChange={(v) => setForm({ ...form, toGuardId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Cualquier vigilante</SelectItem>
                          {guards.map((g) => (
                            <SelectItem key={g.userId} value={g.userId}>{g.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Notas</Label>
                      <Textarea
                        rows={4}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Describa los detalles del intercambio..."
                      />
                    </div>
                  </div>
                  <SheetFooter>
                    <Button
                      variant="brand"
                      className="w-full sm:w-auto"
                      disabled={saving}
                      onClick={handleCreate}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      AÑADIR
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary">
                    <Filter className="h-4 w-4 mr-2" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader className="relative">
                    <SheetTitle>Filtros</SheetTitle>
                    <Button variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setIsFiltersOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">Usa el filtro de estado en la barra principal para filtrar las solicitudes.</p>
                    <Button variant="brand" className="w-full" onClick={() => setIsFiltersOpen(false)}>
                      Cerrar
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary">
                    <EllipsisVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem>
                    <FileText className="mr-2 h-4 w-4" /> Exportar como PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar como Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" /> Enviar Informe por Correo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Table */}
        <Section title="Solicitudes de intercambio" icon={<ArrowLeftRight />} contentClassName="overflow-x-auto -mx-1">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="font-bold text-foreground">Fecha de solicitud</TableHead>
                <TableHead className="font-bold text-foreground">Solicitud enviada por</TableHead>
                <TableHead className="font-bold text-foreground">Solicitud enviada a</TableHead>
                <TableHead className="font-bold text-foreground">Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[200px] text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[360px] text-center">
                    <EmptyState
                      icon={<ArrowLeftRight />}
                      title="No se encontraron resultados"
                      description="No pudimos encontrar ningún elemento que coincida con su búsqueda."
                      className="border-0 py-2"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>{formatDate(rec.requestDate)}</TableCell>
                    <TableCell>{rec.fromGuard?.fullName ?? "—"}</TableCell>
                    <TableCell>{rec.toGuard?.fullName ?? "Abierto"}</TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rec.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(rec.id)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(rec.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-red-500" /> Rechazar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(rec.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Section>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-sm text-muted-foreground">Elementos por página</div>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground mx-4">
            {filtered.length === 0
              ? "0 of 0"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <span className="sr-only">Página anterior</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <span className="sr-only">Página siguiente</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
