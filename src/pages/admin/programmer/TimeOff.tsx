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
  Search, Filter, EllipsisVertical, Upload, FileText, FileSpreadsheet,
  Printer, Mail, ChevronsUpDown, X, Loader2, CheckCircle, XCircle, Trash2,
} from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import timeOffRequestService, { TimeOffRecord } from "@/lib/api/timeOffRequestService";
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

export default function TimeOff() {
  const [records, setRecords] = useState<TimeOffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Guards for the form
  const [guards, setGuards] = useState<GuardOption[]>([]);

  // New Request Form
  const [form, setForm] = useState({
    guard: "",
    type: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
    comment: "",
    isPaid: false,
  });

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 500 };
      if (statusFilter !== "all") params["filter[status]"] = statusFilter;
      const { rows } = await timeOffRequestService.list(params);
      setRecords(rows);
    } catch (err) {
      console.error("Failed to fetch time-off requests", err);
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

  // ── derived ───────────────────────────────────────────────────────────────
  const stats = {
    pending: records.filter((r) => r.status === "pending").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };

  const q = searchQuery.toLowerCase().trim();
  const filtered = records.filter((r) => {
    if (!q) return true;
    const guardName = r.guard?.fullName ?? "";
    return (
      guardName.toLowerCase().includes(q) ||
      (r.type ?? "").toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── handlers ──────────────────────────────────────────────────────────────
  const resetForm = () =>
    setForm({ guard: "", type: "", startDate: "", startTime: "", endDate: "", endTime: "", reason: "", comment: "", isPaid: false });

  const handleCreate = async () => {
    if (!form.type || !form.startDate || !form.endDate || !form.reason) {
      toast.error("Por favor complete los campos requeridos: Tipo, Desde, Hasta y Razón");
      return;
    }
    setSaving(true);
    try {
      await timeOffRequestService.create({
        type: form.type,
        startDate: form.startDate,
        startTime: form.startTime || undefined,
        endDate: form.endDate,
        endTime: form.endTime || undefined,
        reason: form.reason,
        guard: form.guard || undefined,
        isPaid: form.isPaid,
      });
      await fetchRecords();
      setIsNewRequestOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create time-off request", err);
      toast.error("Error al crear la solicitud. Inténtelo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await timeOffRequestService.updateStatus(id, "approved");
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to approve", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await timeOffRequestService.updateStatus(id, "rejected");
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to reject", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Eliminar solicitud', message: "¿Eliminar esta solicitud?", confirmText: 'Eliminar', tone: 'danger' }))) return;
    try {
      await timeOffRequestService.destroy(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">Aprobado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Solicitudes de tiempo libre" },
        ]}
      />
      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rechazadas</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

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
                placeholder="Buscar vigilante, tipo o razón"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* New Request Sheet */}
              <Sheet open={isNewRequestOpen} onOpenChange={(v) => { setIsNewRequestOpen(v); if (!v) resetForm(); }}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]">
                    Nueva entrada
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader className="relative">
                    <SheetTitle>Nueva solicitud de tiempo libre</SheetTitle>
                    <Button variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setIsNewRequestOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="grid gap-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Vigilante</Label>
                        <Select value={form.guard} onValueChange={(v) => setForm({ ...form, guard: v })}>
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
                        <Label>Tipo*</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vacation">Vacaciones</SelectItem>
                            <SelectItem value="sick">Enfermedad</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="training">Capacitación</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Desde*</Label>
                        <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hora</Label>
                        <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Hasta*</Label>
                        <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hora</Label>
                        <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Razón*</Label>
                      <Input
                        placeholder="Describa la razón..."
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Comentario</Label>
                      <Textarea
                        rows={3}
                        value={form.comment}
                        onChange={(e) => setForm({ ...form, comment: e.target.value })}
                        placeholder="Comentario adicional..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="isPaid"
                        checked={form.isPaid}
                        onCheckedChange={(v) => setForm({ ...form, isPaid: v as boolean })}
                      />
                      <Label htmlFor="isPaid" className="text-sm font-normal cursor-pointer">Pagado</Label>
                    </div>
                  </div>
                  <SheetFooter>
                    <Button
                      className="bg-[#C8860A] hover:bg-[#B37809] text-white w-full sm:w-auto"
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
                  <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]">
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
                    <p className="text-sm text-muted-foreground">Usa el filtro de estado en la barra principal para filtrar por pendiente, aprobado o rechazado.</p>
                    <Button
                      className="w-full bg-[#C8860A] hover:bg-[#B37809] text-white"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#C8860A]">
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
                    <Mail className="mr-2 h-4 w-4" /> Correo Electrónico
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="font-bold text-foreground">Fecha de solicitud</TableHead>
                <TableHead className="font-bold text-foreground">Vigilante</TableHead>
                <TableHead className="font-bold text-foreground">Tipo</TableHead>
                <TableHead className="font-bold text-foreground">Desde</TableHead>
                <TableHead className="font-bold text-foreground">Hasta</TableHead>
                <TableHead className="font-bold text-foreground">Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[200px] text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="bg-blue-500/10 p-6 rounded-full mb-4">
                        <svg className="w-12 h-12 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No se encontraron resultados</h3>
                      <p className="text-sm max-w-xs">No pudimos encontrar ningún elemento que coincida con su búsqueda</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>{formatDate(rec.requestDate)}</TableCell>
                    <TableCell>{rec.guard?.fullName ?? rec.guardName ?? "—"}</TableCell>
                    <TableCell className="capitalize">{rec.type ?? "—"}</TableCell>
                    <TableCell>
                      {rec.startDate ? `${rec.startDate}${rec.startTime ? " " + rec.startTime : ""}` : "—"}
                    </TableCell>
                    <TableCell>
                      {rec.endDate ? `${rec.endDate}${rec.endTime ? " " + rec.endTime : ""}` : "—"}
                    </TableCell>
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
        </div>

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
      </div>
    </AppLayout>
  );
}
