import { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PageContainer, PageHeader, Section, StatCard, EmptyState, SkeletonCards, Modal, Stagger,
} from "@/components/kit";
import {
  ShieldAlert, ShieldCheck, Clock, UserPlus, ArrowRightLeft, RefreshCw, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import coverageService, {
  COVERAGE_REASONS, REASON_LABEL, STATUS_LABEL, coverageErrorCode,
  type LiveCoverage, type StationCoverage, type CoverageEvent, type CoverageReason,
} from "@/lib/api/coverageService";

/**
 * Cobertura en vivo — the office's operational view.
 *
 * The Horario says who was PLANNED. This says who is actually standing at each
 * post right now, which is the only thing that matters when a client calls to
 * ask why nobody is at their gate. Uncovered posts sort first, and every gap
 * carries the action that closes it.
 */

const STATUS_STYLE: Record<string, string> = {
  uncovered: "bg-destructive/12 text-destructive border-destructive/30",
  at_risk: "bg-amber-500/12 text-amber-600 border-amber-500/30",
  covered: "bg-emerald-500/12 text-emerald-600 border-emerald-500/30",
  idle: "bg-muted text-muted-foreground border-border",
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });

export default function Coverage() {
  const [live, setLive] = useState<LiveCoverage | null>(null);
  const [events, setEvents] = useState<CoverageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"board" | "events">("board");

  // Report-absence modal
  const [absenceFor, setAbsenceFor] = useState<any | null>(null);
  const [reason, setReason] = useState<CoverageReason>("permiso_con_sueldo");
  const [note, setNote] = useState("");

  // Cover-post modal
  const [coverFor, setCoverFor] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[] | null>(null);

  // Transfer modal. A traslado is temporary by construction: it moves only the
  // turnos inside the chosen range, so the vigilante returns to their own post
  // on the next one — there is no separate "expiry" to run or forget.
  const [transferFor, setTransferFor] = useState<any | null>(null);
  const [toStationId, setToStationId] = useState("");
  const [transferMode, setTransferMode] = useState<"shift" | "range">("shift");
  const [transferUntil, setTransferUntil] = useState("");

  const load = useCallback(async () => {
    try {
      const [l, e] = await Promise.all([
        coverageService.live(),
        coverageService.events({ status: "open,covered" }),
      ]);
      setLive(l);
      setEvents(e?.rows || []);
    } catch {
      toast.error("No se pudo cargar la cobertura");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // The board is watched during an incident, so it must not go stale in front
    // of whoever is staring at it.
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  /**
   * `rest_day` is the server asking for confirmation of a real decision, not a
   * failure — re-issue with the confirmation instead of dead-ending the user.
   */
  const runWithConfirm = async (call: (confirm: boolean) => Promise<any>, okMsg: string) => {
    setBusy(true);
    try {
      try {
        await call(false);
      } catch (e: any) {
        const code = coverageErrorCode(e);
        if (code === "rest_day") {
          if (!window.confirm("Ese vigilante está en descanso ese día. ¿Asignarlo de todos modos?")) return;
          await call(true);
        } else if (code) {
          toast.error(e?.response?.data?.message || "No se pudo completar la acción");
          return;
        } else {
          throw e;
        }
      }
      toast.success(okMsg);
      await load();
      return true;
    } catch {
      toast.error("No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  };

  const submitAbsence = async () => {
    const row = absenceFor;
    if (!row) return;
    const ok = await runWithConfirm(
      () =>
        coverageService.reportAbsence({
          guardId: row.guardId,
          reason,
          reasonNote: note.trim() || undefined,
          shiftId: row.shiftId,
          stationId: row.stationId,
        }),
      "Novedad registrada",
    );
    if (ok) { setAbsenceFor(null); setNote(""); }
  };

  const openCover = async (ev: any) => {
    setCoverFor(ev);
    setCandidates(null);
    try {
      setCandidates(await coverageService.candidates({ eventId: ev.id }));
    } catch {
      setCandidates([]);
    }
  };

  /** Today in the TENANT's calendar, so the date input matches the operation. */
  const tenantToday = () => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: live?.tz || "America/Mexico_City" })
        .format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const submitTransfer = async () => {
    const row = transferFor;
    if (!row || !toStationId) return;
    const range = transferMode === "range" && transferUntil;
    const ok = await runWithConfirm(
      (confirm) =>
        coverageService.transfer({
          guardId: row.guardId,
          toStationId,
          // Either this one turno, or every turno from today through the chosen
          // date. Dates go as plain YYYY-MM-DD and are resolved in the tenant's
          // timezone server-side — parsing them here would drop the last day.
          ...(range
            ? { dateFrom: tenantToday(), dateTo: transferUntil }
            : { shiftIds: row.shiftId ? [row.shiftId] : undefined }),
          reasonNote: note.trim() || undefined,
          allowRestDay: confirm,
        }),
      range ? `Trasladado hasta el ${transferUntil}` : "Vigilante trasladado",
    );
    if (ok) { setTransferFor(null); setToStationId(""); setNote(""); setTransferMode("shift"); setTransferUntil(""); }
  };

  const summary = live?.summary || {};
  const problems = (summary.uncovered || 0) + (summary.at_risk || 0);

  const openEvents = useMemo(() => events.filter((e) => e.status === "open"), [events]);

  const StationRow = ({ st }: { st: StationCoverage }) => (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{st.stationName || "—"}</p>
          {st.minutesSinceStart != null && st.status !== "covered" && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {st.minutesSinceStart} min desde el inicio del turno
            </p>
          )}
        </div>
        <Badge variant="outline" className={STATUS_STYLE[st.status]}>
          {STATUS_LABEL[st.status]}
        </Badge>
      </div>

      {st.expected.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {st.expected.map((e) => {
            const here = st.present.some((p) => p.guardId === e.guardId);
            return (
              <div key={e.shiftId} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.fullName || "Vigilante"}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(e.startTime)}–{fmtTime(e.endTime)} ·{" "}
                    <span className={here ? "text-emerald-600" : "text-destructive"}>
                      {here ? "En el puesto" : "Sin marcar entrada"}
                    </span>
                  </p>
                </div>
                <Button
                  size="sm" variant="outline"
                  onClick={() => {
                    setTransferFor({ ...e, stationId: st.stationId, stationName: st.stationName });
                    setToStationId(""); setNote("");
                  }}
                >
                  <ArrowRightLeft className="mr-1 size-3.5" /> Trasladar
                </Button>
                {!here && (
                  <Button
                    size="sm" variant="destructive"
                    onClick={() => {
                      setAbsenceFor({ ...e, stationId: st.stationId, stationName: st.stationName });
                      setReason("permiso_con_sueldo"); setNote("");
                    }}
                  >
                    Novedad
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {st.openEvents.map((ev) => (
        <div key={ev.id} className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2">
          <ShieldAlert className="size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-destructive">
              {REASON_LABEL[ev.reason] || ev.reason}
            </p>
            <p className="text-xs text-muted-foreground">Puesto vacío hace {ev.minutesOpen} min</p>
          </div>
          <Button size="sm" onClick={() => openCover(ev)}>
            <UserPlus className="mr-1 size-3.5" /> Cubrir
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <AppLayout>
      <PageContainer>
        <Breadcrumb items={[{ label: "Programador", path: "/admin/programmer/schedule" }, { label: "Cobertura" }]} />
        <PageHeader
          title="Cobertura en vivo"
          subtitle={
            problems > 0
              ? `${problems} puesto(s) requieren atención`
              : "Todos los puestos cubiertos"
          }
          icon={<ShieldCheck />}
          actions={
            <Button variant="outline" onClick={load} disabled={busy}>
              <RefreshCw className="mr-1.5 size-4" /> Actualizar
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Sin cubrir" value={summary.uncovered || 0} icon={<ShieldAlert />} />
          <StatCard label="En riesgo" value={summary.at_risk || 0} icon={<Clock />} />
          <StatCard label="Cubiertos" value={summary.covered || 0} icon={<ShieldCheck />} />
          <StatCard label="Novedades abiertas" value={openEvents.length} icon={<ArrowRightLeft />} />
        </div>

        <div className="flex gap-2">
          <Button variant={tab === "board" ? "default" : "outline"} size="sm" onClick={() => setTab("board")}>
            Puestos
          </Button>
          <Button variant={tab === "events" ? "default" : "outline"} size="sm" onClick={() => setTab("events")}>
            Novedades ({events.length})
          </Button>
        </div>

        {loading ? (
          <SkeletonCards />
        ) : tab === "board" ? (
          <Section title="Estado de los puestos">
            {!live?.stations.length ? (
              <EmptyState title="Sin estaciones" description="No hay estaciones configuradas." />
            ) : (
              <Stagger className="grid gap-3 lg:grid-cols-2">
                {live.stations.map((st) => <StationRow key={st.stationId} st={st} />)}
              </Stagger>
            )}
          </Section>
        ) : (
          <Section title="Novedades registradas">
            {!events.length ? (
              <EmptyState title="Sin novedades" description="No se han registrado novedades en el período." />
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {[ev.absentGuard?.firstName, ev.absentGuard?.lastName].filter(Boolean).join(" ") || "Vigilante"}
                        {" · "}
                        <span className="font-normal text-muted-foreground">
                          {REASON_LABEL[ev.reason] || ev.reason}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ev.originStation?.stationName || "—"}
                        {ev.targetStation ? ` → ${ev.targetStation.stationName}` : ""}
                        {" · "}
                        {new Date(ev.windowStart).toLocaleDateString("es-EC")}
                        {/* Same day start/end reads as one turno; otherwise show
                            the span so a multi-day traslado is legible. */}
                        {new Date(ev.windowEnd).toLocaleDateString("es-EC") !==
                          new Date(ev.windowStart).toLocaleDateString("es-EC") &&
                          ` – ${new Date(ev.windowEnd).toLocaleDateString("es-EC")}`}
                        {ev.coveringGuard && ` · Cubre ${[ev.coveringGuard.firstName, ev.coveringGuard.lastName].filter(Boolean).join(" ")}`}
                      </p>
                      {/* A traslado expires on its own — say where they go back
                          to, so nobody goes looking for a button to undo it. */}
                      {ev.kind === "transfer" && ev.status !== "cancelled" && ev.originStation && (
                        <p className="mt-0.5 text-[11px] text-primary">
                          Vuelve a {ev.originStation.stationName} después del{" "}
                          {new Date(ev.windowEnd).toLocaleDateString("es-EC")}
                        </p>
                      )}
                    </div>
                    {/* Payroll/discipline consequences, visible where they are decided. */}
                    {ev.countsAgainstGuard && <Badge variant="destructive">Falta grave</Badge>}
                    <Badge variant="outline">{ev.paid ? "Con sueldo" : "Sin sueldo"}</Badge>
                    <Badge variant={ev.status === "open" ? "destructive" : "outline"}>
                      {ev.status === "open" ? "Sin cubrir" : ev.status === "covered" ? "Cubierto" : ev.status}
                    </Badge>
                    {ev.status === "open" && (
                      <Button size="sm" onClick={() => openCover(ev)}>
                        <UserPlus className="mr-1 size-3.5" /> Cubrir
                      </Button>
                    )}
                    {ev.status !== "cancelled" && (
                      <Button
                        size="sm" variant="ghost" disabled={busy}
                        title="Anular la novedad y devolver el turno a la rotación"
                        onClick={() => runWithConfirm(() => coverageService.cancel(ev.id), "Novedad anulada")}
                      >
                        <Undo2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Report a novedad ─────────────────────────────────────────────── */}
        <Modal
          open={!!absenceFor}
          onOpenChange={(o) => !o && setAbsenceFor(null)}
          title="Marcar novedad"
          description={`${absenceFor?.fullName || "Vigilante"} · ${absenceFor?.stationName || ""}`}
          icon={<ShieldAlert />}
          footer={
            <>
              <Button variant="outline" onClick={() => setAbsenceFor(null)}>Cancelar</Button>
              <Button onClick={submitAbsence} disabled={busy}>Registrar</Button>
            </>
          }
        >
          <div className="space-y-3 p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Motivo</label>
              <Select value={reason} onValueChange={(v) => setReason(v as CoverageReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COVERAGE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{REASON_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* The reason is not a label: it decides pay and discipline. */}
              <p className="mt-1 text-xs text-muted-foreground">
                El motivo define si la ausencia es remunerada y si afecta el récord del vigilante.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Detalle (opcional)</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="Ej.: llamó, se le dañó la moto en la vía" />
            </div>
          </div>
        </Modal>

        {/* ── Cover an empty post ──────────────────────────────────────────── */}
        <Modal
          open={!!coverFor}
          onOpenChange={(o) => !o && setCoverFor(null)}
          title="¿Quién cubre el puesto?"
          icon={<UserPlus />}
        >
          <div className="space-y-2 p-5">
            {candidates == null ? (
              <SkeletonCards />
            ) : !candidates.length ? (
              <EmptyState title="Sin vigilantes disponibles" description="Nadie está libre en ese horario." />
            ) : (
              candidates.map((c) => (
                <button
                  key={c.guardId}
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
                  onClick={async () => {
                    const ok = await runWithConfirm(
                      (confirm) => coverageService.cover(coverFor.id, c.guardId, confirm),
                      "Puesto cubierto",
                    );
                    if (ok) setCoverFor(null);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.fullName || "Vigilante"}</p>
                    {/* Why the system suggests them — the operator can overrule it. */}
                    <p className="text-xs text-muted-foreground">{c.reason}</p>
                  </div>
                  <UserPlus className="size-4 text-primary" />
                </button>
              ))
            )}
          </div>
        </Modal>

        {/* ── Temporary transfer ───────────────────────────────────────────── */}
        <Modal
          open={!!transferFor}
          onOpenChange={(o) => !o && setTransferFor(null)}
          title="Traslado temporal"
          description={`${transferFor?.fullName || "Vigilante"} · desde ${transferFor?.stationName || ""}`}
          icon={<ArrowRightLeft />}
          footer={
            <>
              <Button variant="outline" onClick={() => setTransferFor(null)}>Cancelar</Button>
              <Button onClick={submitTransfer} disabled={busy || !toStationId}>Trasladar</Button>
            </>
          }
        >
          <div className="space-y-3 p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Estación destino</label>
              <Select value={toStationId} onValueChange={setToStationId}>
                <SelectTrigger><SelectValue placeholder="Seleccione una estación" /></SelectTrigger>
                <SelectContent>
                  {/* The live payload already carries every station the caller
                      may see, correctly tenant-scoped — no second fetch needed. */}
                  {(live?.stations || [])
                    .filter((s) => String(s.stationId) !== String(transferFor?.stationId))
                    .map((s) => (
                      <SelectItem key={s.stationId} value={String(s.stationId)}>
                        {s.stationName || s.stationId}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duración</label>
              <div className="flex gap-2">
                <Button
                  type="button" size="sm"
                  variant={transferMode === "shift" ? "default" : "outline"}
                  onClick={() => setTransferMode("shift")}
                >
                  Solo este turno
                </Button>
                <Button
                  type="button" size="sm"
                  variant={transferMode === "range" ? "default" : "outline"}
                  onClick={() => { setTransferMode("range"); if (!transferUntil) setTransferUntil(tenantToday()); }}
                >
                  Hasta una fecha
                </Button>
              </div>
              {transferMode === "range" && (
                <input
                  type="date"
                  value={transferUntil}
                  min={tenantToday()}
                  onChange={(e) => setTransferUntil(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="Ej.: refuerzo por evento en el cliente" />
            </div>
            {/* The single most important thing to state plainly: the traslado
                ENDS BY ITSELF. It moves only the turnos in the range, so the
                next one is back at their own post — nothing to remember. */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <p className="font-semibold text-foreground">
                {transferMode === "range" && transferUntil
                  ? `Cubre ${transferFor?.stationName ? "otro puesto" : "el destino"} hasta el ${transferUntil}.`
                  : "Cubre el destino solo en este turno."}
              </p>
              <p className="mt-1 text-muted-foreground">
                Después vuelve automáticamente a <strong>{transferFor?.stationName || "su puesto"}</strong>.
                No hace falta revertirlo: solo se trasladan los turnos del rango.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              El vigilante podrá marcar entrada en la estación destino y recibirá sus
              recordatorios de turno allí, como cualquier turno normal. El puesto que deja
              queda visible como <strong>sin cubrir</strong> hasta que se asigne un reemplazo.
            </p>
          </div>
        </Modal>
      </PageContainer>
    </AppLayout>
  );
}
