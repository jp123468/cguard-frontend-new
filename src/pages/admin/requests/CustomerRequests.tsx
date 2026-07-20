import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, EllipsisVertical, Loader2, CheckCircle, RotateCcw, AlertCircle,
  Inbox, MailQuestion, MailOpen, Layers,
} from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import customerRequestService, { CustomerRequestRecord } from "@/lib/api/customerRequestService";
import { PageContainer, PageHeader, Section, StatCard, StatusBadge, EmptyState, Stagger } from "@/components/kit";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The customer app posts requests with callerType='client'.
const isCustomerRequest = (r: CustomerRequestRecord) =>
  String(r.callerType ?? "").toLowerCase() === "client";

// ── component ────────────────────────────────────────────────────────────────

export default function CustomerRequests() {
  const [records, setRecords] = useState<CustomerRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "abierto" | "cerrado">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { rows } = await customerRequestService.list({ limit: 500 });
      // Only customer-originated requests (callerType='client').
      setRecords((rows || []).filter(isCustomerRequest));
    } catch (err) {
      console.error("Failed to fetch customer requests", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── stats ─────────────────────────────────────────────────────────────────
  const stats = {
    open: records.filter((r) => r.status === "abierto").length,
    closed: records.filter((r) => r.status === "cerrado").length,
    total: records.length,
  };

  // ── filter + paginate ─────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();
  const filtered = records.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (
      (r.subject ?? "").toLowerCase().includes(q) ||
      (r.content ?? "").toLowerCase().includes(q) ||
      (r.callerName ?? "").toLowerCase().includes(q) ||
      (r.station?.stationName ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSetStatus = async (id: string, status: "abierto" | "cerrado") => {
    try {
      await customerRequestService.updateStatus(id, status);
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(status === "cerrado" ? "Solicitud marcada como atendida" : "Solicitud reabierta");
    } catch (err) {
      console.error("Failed to update request status", err);
      toast.error("Error al actualizar la solicitud. Inténtelo de nuevo.");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "abierto":
        return <StatusBadge tone="orange">Abierta</StatusBadge>;
      case "cerrado":
        return <StatusBadge tone="green">Atendida</StatusBadge>;
      default:
        return <Badge variant="outline">{status ?? "—"}</Badge>;
    }
  };

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Solicitudes de clientes" },
        ]}
      />
      <PageContainer width="wide" className="p-6">
        <PageHeader
          icon={<Inbox />}
          title="Solicitudes de clientes"
          subtitle="Mensajes y solicitudes enviadas desde la app de clientes"
        />

        {/* Stats */}
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Abiertas" value={stats.open} icon={<MailQuestion />} accent="orange" />
          <StatCard label="Atendidas" value={stats.closed} icon={<MailOpen />} accent="green" />
          <StatCard label="Total" value={stats.total} icon={<Layers />} accent="primary" />
        </Stagger>

        <Section>
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="w-full md:w-52">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as "all" | "abierto" | "cerrado"); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="abierto">Abierta</SelectItem>
                <SelectItem value="cerrado">Atendida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por asunto, cliente o estación..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-foreground">Fecha</TableHead>
                <TableHead className="font-bold text-foreground">Cliente</TableHead>
                <TableHead className="font-bold text-foreground">Asunto</TableHead>
                <TableHead className="font-bold text-foreground">Mensaje</TableHead>
                <TableHead className="font-bold text-foreground">Estación</TableHead>
                <TableHead className="font-bold text-foreground">Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[200px] text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[300px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                      <h3 className="text-lg font-medium text-foreground mb-1">No se pudo cargar la información</h3>
                      <p className="text-sm max-w-xs mb-4">Ocurrió un error al obtener las solicitudes.</p>
                      <Button variant="outline" onClick={fetchRecords}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Reintentar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[400px] text-center">
                    <EmptyState
                      icon={<Inbox />}
                      title="No hay solicitudes de clientes"
                      description="Las solicitudes enviadas desde la app de clientes aparecerán aquí."
                      className="border-0"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(rec.dateTime || rec.createdAt)}</TableCell>
                    <TableCell>{rec.callerName ?? "—"}</TableCell>
                    <TableCell className="font-medium">{rec.subject ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground" title={rec.content ?? undefined}>
                      {rec.content ?? "—"}
                    </TableCell>
                    <TableCell>{rec.station?.stationName ?? "—"}</TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rec.status !== "cerrado" ? (
                            <DropdownMenuItem onClick={() => handleSetStatus(rec.id, "cerrado")}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Marcar como atendida
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleSetStatus(rec.id, "abierto")}>
                              <RotateCcw className="mr-2 h-4 w-4 text-yellow-500" /> Reabrir
                            </DropdownMenuItem>
                          )}
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
              ? "0 de 0"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} de ${filtered.length}`}
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
        </Section>
      </PageContainer>
    </AppLayout>
  );
}
