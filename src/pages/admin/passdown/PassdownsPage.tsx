import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { DataTable, type Column } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClipboardSignature, Repeat, ListChecks, ImageOff } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Section,
  SkeletonCards,
  StatusBadge,
  EmptyState,
  Modal,
  Field,
} from "@/components/kit";
import passdownService, {
  type Passdown,
  type PassdownDetail,
  type PassdownStatus,
} from "@/lib/api/passdownService";

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-EC");
}

const PRIORITY_META: Record<string, { label: string; tone: "red" | "orange" | "slate" }> = {
  alta: { label: "Alta", tone: "red" },
  media: { label: "Media", tone: "orange" },
  baja: { label: "Baja", tone: "slate" },
};

const FILTERS: Array<{ key: PassdownStatus | "all"; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abiertos" },
  { key: "received", label: "Recibidos" },
];

function StatusPill({ status }: { status: PassdownStatus }) {
  return status === "received" ? (
    <StatusBadge tone="green">Recibido</StatusBadge>
  ) : (
    <StatusBadge tone="orange">Pendiente de recibir</StatusBadge>
  );
}

function imageSrc(img: { downloadUrl?: string | null; publicUrl?: string | null }): string | null {
  return img.downloadUrl || img.publicUrl || null;
}

export default function PassdownsPage() {
  const [rows, setRows] = useState<Passdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PassdownStatus | "all">("all");

  const [detail, setDetail] = useState<PassdownDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    passdownService
      .list({ status: filter === "all" ? undefined : filter, limit: 200 })
      .then((r) => setRows(r.rows || []))
      .catch((e: any) => toast.error(e?.message || "Error al cargar los pases de turno"))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(load, [load]);

  const openDetail = async (row: Passdown) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await passdownService.get(row.id);
      setDetail(r.passdown);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cargar el pase de turno");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: Column<Passdown>[] = [
    {
      key: "stationName",
      header: "Puesto",
      render: (_v, r) => (
        <span className="font-medium text-foreground flex items-center gap-1.5">
          {r.stationName || ((r as any).channel === "supervisor" ? "Supervisión" : "—")}
          {(r as any).channel === "supervisor" && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Supervisor</span>
          )}
        </span>
      ),
    },
    {
      key: "outgoingGuardName",
      header: "Vigilante saliente",
      render: (_v, r) => (
        <span className="text-xs text-muted-foreground">{r.outgoingGuardName || "—"}</span>
      ),
    },
    {
      key: "shiftLabel",
      header: "Turno",
      render: (_v, r) => <span className="text-xs text-muted-foreground">{r.shiftLabel || "—"}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (_v, r) => <StatusPill status={r.status} />,
    },
    {
      key: "instructionCount",
      header: "Consignas",
      render: (_v, r) => (
        <span className="text-xs text-muted-foreground">{r.instructionCount ?? 0}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Creado",
      render: (_v, r) => <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: "receivedByName",
      header: "Recibido por",
      render: (_v, r) =>
        r.status === "received" ? (
          <span className="text-xs text-muted-foreground">
            {r.receivedByName || "—"}
            {r.receivedAt ? ` · ${fmtDate(r.receivedAt)}` : ""}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <PageContainer width="wide">
          <PageHeader
            icon={<ClipboardSignature />}
            title="Pases de turno"
            subtitle="Entregas de turno de los vigilantes: novedades, consignas e imágenes del relevo."
          />

          <Section
            title="Pases de turno"
            icon={<Repeat />}
            action={
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={filter === f.key ? "default" : "outline"}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            }
          >
            {loading ? (
              <SkeletonCards count={4} />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<ClipboardSignature />}
                title="No hay pases de turno"
                description="Cuando los vigilantes registren la entrega de su turno, aparecerán aquí."
              />
            ) : (
              <DataTable columns={columns} data={rows} onRowClick={openDetail} />
            )}
          </Section>
        </PageContainer>
      </div>

      <Modal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        icon={<ClipboardSignature />}
        title="Pase de turno"
        description={detail?.shiftLabel || undefined}
        size="lg"
      >
        {detailLoading || !detail ? (
          <SkeletonCards count={2} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Puesto" value={detail.stationName} />
              <Field label="Vigilante saliente" value={detail.outgoingGuardName} />
              <Field label="Turno" value={detail.shiftLabel} />
              <Field label="Creado" value={fmtDate(detail.createdAt)} />
              <div className="min-w-0">
                <div className="cg-eyebrow mb-1">Estado</div>
                <StatusPill status={detail.status} />
              </div>
              {detail.status === "received" && (
                <Field
                  label="Recibido por"
                  value={
                    detail.receivedByName
                      ? `${detail.receivedByName}${detail.receivedAt ? ` · ${fmtDate(detail.receivedAt)}` : ""}`
                      : "—"
                  }
                />
              )}
            </div>

            <div>
              <div className="cg-eyebrow mb-1">Novedades</div>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {detail.notes?.trim() || "Sin novedades registradas."}
              </p>
            </div>

            {detail.passdownImages && detail.passdownImages.length > 0 && (
              <div>
                <div className="cg-eyebrow mb-2">Imágenes</div>
                <div className="flex flex-wrap gap-3">
                  {detail.passdownImages.map((img, i) => {
                    const src = imageSrc(img);
                    return src ? (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-24 w-24 overflow-hidden rounded-xl border bg-muted"
                      >
                        <img
                          src={src}
                          alt={`Imagen del pase ${i + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div
                        key={i}
                        className="flex h-24 w-24 items-center justify-center rounded-xl border bg-muted text-muted-foreground [&_svg]:size-6"
                      >
                        <ImageOff />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
                <ListChecks />
                <span className="cg-eyebrow">Consignas ({detail.instructions?.length ?? 0})</span>
              </div>
              {detail.instructions && detail.instructions.length > 0 ? (
                <div className="space-y-2">
                  {detail.instructions.map((ins) => {
                    const pr = PRIORITY_META[ins.priority || "media"] || PRIORITY_META.media;
                    return (
                      <div
                        key={ins.id}
                        className="flex items-start justify-between gap-3 rounded-xl border p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{ins.taskToDo}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge tone={pr.tone}>{pr.label}</StatusBadge>
                            {ins.completionNotes && (
                              <span className="text-xs text-muted-foreground">
                                {ins.completionNotes}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {ins.wasItDone ? (
                            <StatusBadge tone="green">Realizada</StatusBadge>
                          ) : (
                            <StatusBadge tone="slate">Pendiente</StatusBadge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin consignas registradas.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
