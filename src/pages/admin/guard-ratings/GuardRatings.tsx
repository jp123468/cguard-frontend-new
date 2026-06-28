import { useState, useEffect, useCallback } from "react";
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
import { Search, Star, Loader2, RotateCcw, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import guardRatingService, { GuardRatingRecord } from "@/lib/api/guardRatingService";
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

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
        />
      ))}
    </span>
  );
}

interface GuardOption { id: string; fullName: string; }

// ── component ────────────────────────────────────────────────────────────────

export default function GuardRatings() {
  const [records, setRecords] = useState<GuardRatingRecord[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [guardFilter, setGuardFilter] = useState<string>("all");
  const [guards, setGuards] = useState<GuardOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── fetch ratings ───────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await guardRatingService.list({
        guardId: guardFilter !== "all" ? guardFilter : undefined,
        limit: 500,
      });
      setRecords(result.rows || []);
      setAverage(result.average);
      setCount(result.count);
    } catch (err) {
      console.error("Failed to fetch guard ratings", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [guardFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Load guards for the filter dropdown (guardRating.guardId = securityGuard.id PK).
  useEffect(() => {
    (async () => {
      try {
        const resp: any = await securityGuardService.list({ limit: 500, offset: 0 } as any);
        const items: any[] = Array.isArray(resp) ? resp : (resp.rows ?? []);
        const opts: GuardOption[] = items
          .map((item: any) => {
            const id = item.id ?? null;
            const fullName = item.fullName ?? item.guard?.fullName ?? "";
            return id ? { id: String(id), fullName } : null;
          })
          .filter(Boolean) as GuardOption[];
        setGuards(opts);
      } catch (e) {
        console.error("Failed to load guards", e);
      }
    })();
  }, []);

  // ── filter + paginate ─────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();
  const filtered = records.filter((r) => {
    if (!q) return true;
    return (
      (r.guardName ?? "").toLowerCase().includes(q) ||
      (r.clientName ?? "").toLowerCase().includes(q) ||
      (r.comment ?? "").toLowerCase().includes(q) ||
      (r.stationName ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Calificaciones de vigilantes" },
        ]}
      />
      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {guardFilter === "all" ? "Promedio general" : "Promedio del vigilante"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-foreground">
                {average != null ? average.toFixed(2) : "—"}
              </p>
              {average != null && <Stars value={Math.round(average)} />}
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Calificaciones</p>
            <p className="text-2xl font-bold text-foreground">{count}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="w-full md:w-64">
            <Select value={guardFilter} onValueChange={(v) => { setGuardFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los vigilantes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vigilantes</SelectItem>
                {guards.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por vigilante, cliente o comentario..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-foreground">Fecha</TableHead>
                <TableHead className="font-bold text-foreground">Vigilante</TableHead>
                <TableHead className="font-bold text-foreground">Cliente</TableHead>
                <TableHead className="font-bold text-foreground">Estación</TableHead>
                <TableHead className="font-bold text-foreground">Calificación</TableHead>
                <TableHead className="font-bold text-foreground">Comentario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[200px] text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[300px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                      <h3 className="text-lg font-medium text-foreground mb-1">No se pudo cargar la información</h3>
                      <p className="text-sm max-w-xs mb-4">Ocurrió un error al obtener las calificaciones.</p>
                      <Button variant="outline" onClick={fetchRecords}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Reintentar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="bg-yellow-500/10 p-6 rounded-full mb-4">
                        <Star className="w-12 h-12 text-yellow-200" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No hay calificaciones</h3>
                      <p className="text-sm max-w-xs">Las calificaciones enviadas por los clientes aparecerán aquí.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(rec.createdAt)}</TableCell>
                    <TableCell className="font-medium">{rec.guardName ?? "—"}</TableCell>
                    <TableCell>{rec.clientName ?? "—"}</TableCell>
                    <TableCell>{rec.stationName ?? "—"}</TableCell>
                    <TableCell><Stars value={rec.rating} /></TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground" title={rec.comment ?? undefined}>
                      {rec.comment ?? "—"}
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
      </div>
    </AppLayout>
  );
}
