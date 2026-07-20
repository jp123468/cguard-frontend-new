import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Download, RefreshCw, KeyRound, Server } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PageContainer,
  PageHeader,
  EmptyState,
  Stagger,
} from "@/components/kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { videoService, type RelaySite, type RelayBundle } from "@/lib/api/videoService";


const STATUS: Record<string, { label: string; cls: string }> = {
  publishing: { label: "Transmitiendo", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
  offline: { label: "Sin conexión", cls: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30" },
  unknown: { label: "Sin activar", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};

export default function VideoRelaySites() {
  const [sites, setSites] = useState<RelaySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [bundle, setBundle] = useState<RelayBundle | null>(null);
  const [bundleSite, setBundleSite] = useState<RelaySite | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RelaySite | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    videoService.relaySites()
      .then(setSites)
      .catch((e) => setError((e as Error)?.message || "No se pudieron cargar los sitios relay"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      await videoService.createRelaySite({ name: name.trim(), notes: notes.trim() || undefined });
      toast.success("Sitio relay creado");
      setNewOpen(false); setName(""); setNotes("");
      load();
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo crear el sitio");
    } finally {
      setSaving(false);
    }
  };

  const openBundle = async (s: RelaySite) => {
    setBundleSite(s);
    setBundle(null);
    try {
      setBundle(await videoService.relayBundle(s.id));
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo generar el relay");
      setBundleSite(null);
    }
  };

  const downloadCompose = () => {
    if (!bundle) return;
    const blob = new Blob([bundle.compose], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `docker-compose.${bundle.siteKey}.yml`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const regenToken = async (s: RelaySite) => {
    try {
      await videoService.updateRelaySite(s.id, { regenToken: true });
      toast.success("Token regenerado — vuelve a descargar el relay");
      load();
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo regenerar el token");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await videoService.deleteRelaySite(deleteTarget.id);
      toast.success("Sitio relay eliminado");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo eliminar");
    }
  };

  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Server />}
          title="Sitios remotos (Relay)"
          subtitle="Para DVR/NVR detrás de NAT en otra red o país. El sitio empuja sus cámaras a la nube; no se abren puertos."
          actions={
            <Button onClick={() => setNewOpen(true)} variant="brand">
              <Plus className="mr-2 h-4 w-4" /> Nuevo sitio relay
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
          </div>
        ) : error ? (
          <EmptyState
            icon={<RefreshCw />}
            title="No se pudieron cargar los sitios"
            description={error}
            action={
              <Button variant="outline" onClick={load}>
                <RefreshCw className="mr-2 h-4 w-4" />Reintentar
              </Button>
            }
          />
        ) : sites.length === 0 ? (
          <EmptyState
            icon={<Server />}
            title="Aún no hay sitios remotos"
            description="Crea un sitio, descarga su relay (docker-compose) y ejecútalo en un equipo del sitio donde está el DVR."
          />
        ) : (
          <Stagger className="grid gap-3 lg:grid-cols-2">
            {sites.map((s) => {
              const badge = STATUS[s.status || "unknown"] || STATUS.unknown;
              return (
                <Card key={s.id} className="cg-card-hover"><CardContent className="flex items-start gap-3 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{s.name}</p>
                      <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      siteKey: <code>{s.siteKey}</code> · {String(s.ingestProtocol || "rtmps").toUpperCase()}
                      {s.publishTokenConfigured ? " · token ✓" : " · sin token"}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openBundle(s)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />Descargar relay
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => regenToken(s)}>
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />Regenerar token
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent></Card>
              );
            })}
          </Stagger>
        )}
      </PageContainer>

      {/* New site */}
      <Dialog open={newOpen} onOpenChange={(o) => { if (!saving) { setNewOpen(o); if (!o) { setName(""); setNotes(""); } } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo sitio relay</DialogTitle>
            <DialogDescription>Se generará una clave de sitio y un token de publicación (cifrado).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="BAS - Guayaquil" />
            </div>
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={create} variant="brand">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bundle viewer */}
      <Dialog open={!!bundleSite} onOpenChange={(o) => !o && (setBundleSite(null), setBundle(null))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Relay para “{bundleSite?.name}”</DialogTitle>
            <DialogDescription>
              Ejecuta esto en un equipo siempre encendido del sitio del DVR: <code>docker compose up -d</code>.
              Empuja cada canal hacia la nube (salida; no requiere abrir puertos).
            </DialogDescription>
          </DialogHeader>
          {!bundle ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />Generando…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Ingest:</span> <code>{bundle.ingest}</code></div>
                <div><span className="text-muted-foreground">Canales:</span> {bundle.channelCount}</div>
              </div>
              {bundle.ingest.includes("INGEST_HOST") && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                  El endpoint de ingest aún no está configurado (Fase 2). El relay funcionará cuando se publique el ingest.
                </div>
              )}
              <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{bundle.compose}</pre>
              <DialogFooter>
                <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(bundle.compose); toast.success("Copiado"); }}>
                  Copiar
                </Button>
                <Button onClick={downloadCompose} variant="brand">
                  <Download className="mr-2 h-4 w-4" />Descargar docker-compose
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sitio relay</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar “{deleteTarget?.name}”? Los dispositivos que lo usen dejarán de transmitir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
