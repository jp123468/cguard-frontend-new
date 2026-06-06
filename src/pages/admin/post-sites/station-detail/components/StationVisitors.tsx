import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera, Check, ChevronLeft, ChevronRight, Edit2, Loader2,
  Plus, ScanLine, Trash2, Upload, UserCheck, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { visitorLogService } from '@/lib/api/visitorLogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type Props = { station: any; stationId: string; postSiteId: string };

// ─── Constants ────────────────────────────────────────────────────────────

const LIMIT = 25;
const PLACE_TYPES = ['Casa', 'Departamento', 'Oficina', 'Parking', 'Otro'];

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmt(v: any) {
  if (!v) return '-';
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); }
  catch { return String(v); }
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

function nowLocalInputValue() {
  return toLocalInputValue(new Date().toISOString());
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b[a-záéíóúñü]/g, c => c.toUpperCase());
}

// ─── OCR: Tesseract + Ecuadorian ID parser ────────────────────────────────

async function ocrAndParseId(src: Blob): Promise<{ firstName?: string; lastName?: string; idNumber?: string }> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa');
  try {
    const { data: { text } } = await worker.recognize(src as any);
    const upper = text.toUpperCase();
    const result: { firstName?: string; lastName?: string; idNumber?: string } = {};
    const cedMatch = upper.match(/\b([0-9]{10})\b/);
    if (cedMatch) result.idNumber = cedMatch[1];
    const apellidosMatch = upper.match(/APELLIDOS?\s*[:\n]+\s*([A-ZÁÉÍÓÚÑÜ ]{3,})/);
    if (apellidosMatch) result.lastName = titleCase(apellidosMatch[1].trim());
    const nombresMatch = upper.match(/NOMBRES?\s*[:\n]+\s*([A-ZÁÉÍÓÚÑÜ ]{3,})/);
    if (nombresMatch) result.firstName = titleCase(nombresMatch[1].trim());
    return result;
  } finally {
    await worker.terminate();
  }
}

// ─── Camera Modal ─────────────────────────────────────────────────────────

type CameraMode = 'id-scan' | 'photo';

function CameraModal({ open, mode, onClose, onCapture }: {
  open: boolean; mode: CameraMode;
  onClose: () => void; onCapture: (blob: Blob, url: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState<{ blob: Blob; url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setErr(null); setCaptured(null); setReady(false);
    try {
      const facingMode = mode === 'id-scan' ? { ideal: 'environment' } : { ideal: 'user' };
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 } }, audio: false });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setReady(true); };
      }
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? 'Permiso de cámara denegado.' : e?.name === 'NotFoundError' ? 'No se encontró cámara.' : 'No se pudo acceder a la cámara.');
    }
  }, [mode]);

  const stopCamera = useCallback(() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setReady(false); }, [stream]);

  useEffect(() => { if (open) { startCamera(); } return () => { stream?.getTracks().forEach(t => t.stop()); }; }, [open]);

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    c.toBlob(blob => { if (!blob) return; setCaptured({ blob, url: URL.createObjectURL(blob) }); stopCamera(); }, 'image/jpeg', 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { stopCamera(); onClose(); } }}>
      <DialogContent className="max-w-lg z-[60]">
        <DialogHeader>
          <DialogTitle>{mode === 'id-scan' ? 'Escanear Cédula / ID' : 'Foto del Visitante'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {err ? (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-200 rounded p-3">{err}</div>
          ) : captured ? (
            <div className="space-y-3">
              <img src={captured.url} alt="Captura" className="w-full rounded border" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCaptured(null); startCamera(); }} className="flex-1 gap-1"><X size={14} /> Retomar</Button>
                <Button onClick={() => { onCapture(captured.blob, captured.url); onClose(); }} className="flex-1 gap-1 bg-[#C8860A] hover:bg-[#a86e08] text-white"><Check size={14} /> Usar foto</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {mode === 'id-scan' && <p className="text-xs text-muted-foreground text-center">Apunta al frente de la cédula. Asegúrate de que sea legible y bien iluminada.</p>}
              <div className="relative bg-black rounded overflow-hidden aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!ready && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                {mode === 'id-scan' && ready && <div className="absolute inset-4 border-2 border-dashed border-amber-400 rounded opacity-70 pointer-events-none" />}
              </div>
              <Button onClick={capture} disabled={!ready} className="w-full gap-2 bg-[#C8860A] hover:bg-[#a86e08] text-white"><Camera size={15} /> Capturar</Button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Visitor Form Modal ───────────────────────────────────────────────────

function emptyForm() {
  return { firstName: '', lastName: '', idNumber: '', reason: '', numPeople: 1, placeTypeKind: '', placeTypeValue: '', visitDate: nowLocalInputValue(), exitTime: '' };
}

function VisitorFormModal({ open, initialData, stationId, onClose, onSaved }: {
  open: boolean; initialData?: any; stationId: string; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!initialData?.id;
  const [form, setForm] = useState(emptyForm);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const parts = (initialData.placeType || '').split(' - ');
      setForm({ firstName: initialData.firstName || '', lastName: initialData.lastName || '', idNumber: initialData.idNumber || '', reason: initialData.reason || '', numPeople: initialData.numPeople || 1, placeTypeKind: parts[0] || '', placeTypeValue: parts.slice(1).join(' - ') || '', visitDate: toLocalInputValue(initialData.visitDate) || nowLocalInputValue(), exitTime: toLocalInputValue(initialData.exitTime) || '' });
      setExistingPhotoUrl(initialData?.idPhoto?.[0]?.downloadUrl || initialData?.idPhoto?.[0]?.publicUrl || null);
    } else {
      setForm(emptyForm());
      setExistingPhotoUrl(null);
    }
    setPhotoBlob(null); setPhotoUrl(null);
  }, [open, initialData?.id]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleIdCapture = async (blob: Blob) => {
    setScanning(true);
    try {
      const r = await ocrAndParseId(blob);
      if (r.firstName) set('firstName', r.firstName);
      if (r.lastName) set('lastName', r.lastName);
      if (r.idNumber) set('idNumber', r.idNumber);
      (!r.firstName && !r.lastName && !r.idNumber)
        ? toast.warning('No se pudo extraer información. Complete manualmente.')
        : toast.success('Datos extraídos de la cédula.');
    } catch { toast.error('Error al procesar la imagen del ID.'); }
    finally { setScanning(false); }
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error('Nombre y apellido son obligatorios.'); return; }
    setSaving(true);
    try {
      let idPhotoMeta: any[] | undefined;
      if (photoBlob) {
        const f = photoBlob instanceof File ? photoBlob : new File([photoBlob], `visitor-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const meta = await visitorLogService.uploadPhoto(f);
        idPhotoMeta = [meta];
      }
      const placeType = form.placeTypeKind && form.placeTypeValue ? `${form.placeTypeKind} - ${form.placeTypeValue}` : form.placeTypeKind || form.placeTypeValue || undefined;
      const payload: any = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), idNumber: form.idNumber.trim() || undefined, reason: form.reason.trim() || undefined, numPeople: Number(form.numPeople) || 1, placeType, visitDate: form.visitDate ? new Date(form.visitDate).toISOString() : new Date().toISOString(), exitTime: form.exitTime ? new Date(form.exitTime).toISOString() : null, stationId };
      if (idPhotoMeta) payload.idPhoto = idPhotoMeta;
      if (isEdit) { await visitorLogService.update(initialData.id, payload); toast.success('Registro actualizado.'); }
      else { await visitorLogService.create(payload); toast.success('Visitante registrado.'); }
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || 'Error al guardar.'); }
    finally { setSaving(false); }
  };

  const displayPhoto = photoUrl || existingPhotoUrl;

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v && !saving && !cameraMode) onClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEdit ? 'Editar Visitante' : 'Nuevo Visitante'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* ID Scan */}
            <div className="bg-amber-500/10 border border-amber-200 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1"><ScanLine size={13} /> Escanear Cédula / ID</p>
              <p className="text-xs text-amber-700">Fotografía la cédula para rellenar los campos automáticamente con OCR.</p>
              <Button variant="outline" size="sm" onClick={() => setCameraMode('id-scan')} disabled={scanning} className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-500/15">
                {scanning ? <><Loader2 size={13} className="animate-spin" /> Procesando...</> : <><Camera size={13} /> Escanear</>}
              </Button>
            </div>
            {/* Names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Apellido <span className="text-red-500">*</span></Label><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Pérez García" /></div>
              <div className="space-y-1"><Label>Nombre <span className="text-red-500">*</span></Label><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Juan Carlos" /></div>
            </div>
            {/* ID + NumPeople */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cédula / Pasaporte</Label><Input value={form.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="0912345678" /></div>
              <div className="space-y-1"><Label>N° Personas</Label><Input type="number" min={1} value={form.numPeople} onChange={e => set('numPeople', e.target.value)} /></div>
            </div>
            {/* Place */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Lugar</Label>
                <Select value={form.placeTypeKind} onValueChange={v => set('placeTypeKind', v)}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{PLACE_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Número / Detalle</Label><Input value={form.placeTypeValue} onChange={e => set('placeTypeValue', e.target.value)} placeholder="24-B" /></div>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Entrada</Label><Input type="datetime-local" value={form.visitDate} onChange={e => set('visitDate', e.target.value)} /></div>
              <div className="space-y-1"><Label>Salida</Label><Input type="datetime-local" value={form.exitTime} onChange={e => set('exitTime', e.target.value)} /></div>
            </div>
            {/* Reason */}
            <div className="space-y-1"><Label>Motivo</Label><Input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Visita a familiar, entrega, etc." /></div>
            {/* Photo */}
            <div className="space-y-2">
              <Label>Foto del Visitante</Label>
              {displayPhoto && (
                <div className="relative w-24 h-24">
                  <img src={displayPhoto} alt="Foto" className="w-24 h-24 object-cover rounded-lg border" />
                  <button type="button" onClick={() => { setPhotoBlob(null); setPhotoUrl(null); setExistingPhotoUrl(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><X size={11} /></button>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCameraMode('photo')} className="gap-1"><Camera size={13} /> Tomar foto</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1"><Upload size={13} /> Subir archivo</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoBlob(f); setPhotoUrl(URL.createObjectURL(f)); } }} />
            </div>
            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || scanning} className="flex-1 bg-[#C8860A] hover:bg-[#a86e08] text-white gap-1">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                {isEdit ? 'Actualizar' : 'Registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {cameraMode === 'id-scan' && <CameraModal open mode="id-scan" onClose={() => setCameraMode(null)} onCapture={(blob) => { setCameraMode(null); handleIdCapture(blob); }} />}
      {cameraMode === 'photo' && <CameraModal open mode="photo" onClose={() => setCameraMode(null)} onCapture={(blob, url) => { setCameraMode(null); setPhotoBlob(blob); setPhotoUrl(url); }} />}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function StationVisitors({ stationId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true); setError(null);
    try {
      const res = await visitorLogService.list({ stationId } as any, { limit: LIMIT, offset: page * LIMIT });
      const list = Array.isArray(res) ? res : (res?.rows ?? []);
      setRows(list); setTotal(typeof res?.count === 'number' ? res.count : list.length);
    } catch (e: any) { setError(e?.message || 'Error al cargar visitantes'); }
    finally { setLoading(false); }
  }, [stationId, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    setDeleting(id);
    try { await visitorLogService.delete([id]); toast.success('Eliminado.'); load(); }
    catch (e: any) { toast.error(e?.message || 'Error al eliminar.'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Registro de Visitantes {total > 0 && <span className="ml-1 text-sm font-normal text-muted-foreground">({total})</span>}
        </h3>
        <Button size="sm" onClick={() => { setEditRow(null); setFormOpen(true); }} className="gap-1 bg-[#C8860A] hover:bg-[#a86e08] text-white">
          <Plus size={14} /> Nuevo Visitante
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-[#C8860A]" /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No hay visitantes registrados para este puesto.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Cédula</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Lugar</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Entrada</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Salida</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">Guardia</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/70">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r: any, i: number) => {
                  const photo = r.idPhoto?.[0]?.downloadUrl || r.idPhoto?.[0]?.publicUrl;
                  const fn = r.firstName || ''; const ln = r.lastName || '';
                  const name = `${fn} ${ln}`.trim() || '-';
                  const guard = r.guard ? `${r.guard.firstName || ''} ${r.guard.lastName || ''}`.trim() || r.guard.name || '-' : r.guardName || '-';
                  return (
                    <tr key={r.id || i} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {photo ? <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border" /> : <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700 text-xs font-bold">{(fn[0] || ln[0] || '?').toUpperCase()}</div>}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{name}</td>
                      <td className="px-4 py-3 text-foreground">{r.idNumber || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.placeType || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{fmt(r.visitDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{fmt(r.exitTime)}</td>
                      <td className="px-4 py-3 text-foreground">{guard}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditRow(r); setFormOpen(true); }} className="p-1.5 text-muted-foreground hover:text-[#C8860A] hover:bg-amber-500/10 rounded" title="Editar"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded disabled:opacity-40" title="Eliminar">
                            {deleting === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > LIMIT && (
            <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-foreground/70">
              <span>Mostrando {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} de {total}</span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border disabled:opacity-40 hover:bg-muted/30"><ChevronLeft size={15} /></button>
                <button disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border disabled:opacity-40 hover:bg-muted/30"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </>
      )}

      <VisitorFormModal open={formOpen} initialData={editRow} stationId={stationId} onClose={() => { setFormOpen(false); setEditRow(null); }} onSaved={load} />
    </div>
  );
}
