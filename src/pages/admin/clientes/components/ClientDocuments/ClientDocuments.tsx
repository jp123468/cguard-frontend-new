import { useEffect, useMemo, useRef, useState } from 'react';
import type { Client } from '@/types/client';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { clientService } from '@/lib/api/clientService';
import securityGuardService from '@/lib/api/securityGuardService';
import { Section, EmptyState, StatusBadge, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Search, FileText, FileSpreadsheet, FileImage, FileArchive, File as FileIcon,
  Files, HardDrive, FolderOpen, CalendarPlus, Upload, Download, Trash2, RefreshCw, X, Clock,
} from 'lucide-react';

const inputCls = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-all placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]';

const TYPE_META: Record<string, { icon: any; color: string }> = {
  PDF: { icon: FileText, color: 'text-red-600 bg-red-500/12' },
  Excel: { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-500/12' },
  Word: { icon: FileText, color: 'text-blue-600 bg-blue-500/12' },
  PowerPoint: { icon: FileText, color: 'text-orange-600 bg-orange-500/12' },
  Imagen: { icon: FileImage, color: 'text-violet-600 bg-violet-500/12' },
  Video: { icon: FileImage, color: 'text-pink-600 bg-pink-500/12' },
  Comprimido: { icon: FileArchive, color: 'text-amber-600 bg-amber-500/12' },
  Texto: { icon: FileText, color: 'text-slate-600 bg-slate-500/12' },
};
const typeMeta = (t: string) => TYPE_META[t] || { icon: FileIcon, color: 'text-slate-600 bg-slate-500/12' };

const CATEGORIES = ['Post Orders', 'Manuales', 'Procedimientos', 'Reportes', 'Políticas', 'Contratos', 'Mapas', 'Capacitación', 'Planos', 'Otros'];
const BREAK_META = [
  { key: 'documents', label: 'Documentos', color: '#2563eb' },
  { key: 'images', label: 'Imágenes', color: '#16a34a' },
  { key: 'videos', label: 'Vídeos', color: '#9333ea' },
  { key: 'others', label: 'Otros', color: '#f59e0b' },
];

const fmtDT = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'hace instantes';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
};

function Donut({ segments, centerTop, centerBottom }: { segments: Array<{ value: number; color: string }>; centerTop: string; centerBottom: string }) {
  const R = 52, C = 2 * Math.PI * R, sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <div className="relative h-[140px] w-[140px] shrink-0">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <circle cx="65" cy="65" r={R} fill="none" stroke="currentColor" className="text-muted" strokeWidth="15" />
        {segments.map((s, i) => { const len = (s.value / sum) * C; const el = <circle key={i} cx="65" cy="65" r={R} fill="none" stroke={s.color} strokeWidth="15" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />; offset += len; return el; })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-xl font-bold leading-none">{centerTop}</div>
        <div className="text-xs text-muted-foreground">{centerBottom}</div>
      </div>
    </div>
  );
}

function Kpi({ icon, value, label, sub, accent = 'primary', bar }: any) {
  const ACC: Record<string, string> = { primary: 'bg-primary/12 text-primary', green: 'bg-emerald-500/12 text-emerald-600', orange: 'bg-orange-500/12 text-orange-600', blue: 'bg-blue-500/12 text-blue-600', slate: 'bg-muted text-muted-foreground' };
  return (
    <div className="cg-card p-4">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${ACC[accent]} [&_svg]:size-4`}>{icon}</div>
      <div className="flex items-baseline gap-1.5"><span className="font-display text-2xl font-bold leading-tight">{value}</span>{sub}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      {bar != null && <div className="mt-2 h-1.5 w-full rounded-full bg-muted"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(2, Math.min(100, bar))}%` }} /></div>}
    </div>
  );
}

export default function ClientDocuments({ client }: { client: Client }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const [upCategory, setUpCategory] = useState('Otros');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { const d = await clientService.getClientDocuments(client.id, { q: q.trim() || undefined, category: category || undefined, type: type || undefined, page, perPage }); setData(d); }
    catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, category, type, page, client.id]);

  const kpis = data?.kpis || {};
  const breakdown = data?.breakdown || {};
  const categories: any[] = data?.categories || [];
  const activity: any[] = data?.recentActivity || [];
  const types: string[] = data?.types || [];
  const docs: any[] = data?.documents || [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const fmtUpdated = data?.updatedAt ? new Date(data.updatedAt).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  const donutSegments = useMemo(() => BREAK_META.map((b) => ({ value: breakdown[b.key]?.bytes || 0, color: b.color })).filter((s) => s.value > 0), [breakdown]);
  const resetPage = (fn: (v: any) => void) => (v: any) => { fn(v); setPage(1); };

  const onPick = (files: FileList | null) => { if (files) setPending((prev) => [...prev, ...Array.from(files)]); };

  const doUpload = async () => {
    if (!pending.length) { setUploadOpen(false); return; }
    setUploading(true);
    let ok = 0;
    for (const f of pending) {
      if (f.size > 100 * 1024 * 1024) { toast.error(`Archivo mayor a 100MB: ${f.name}`); continue; }
      try {
        setProgress((p) => ({ ...p, [f.name]: 0 }));
        const uploaded: any = await securityGuardService.uploadFileToStorageWithProgress(f, 'legalDocuments', (pct) => setProgress((p) => ({ ...p, [f.name]: pct })));
        await clientService.createClientDocument(client.id, {
          name: f.name, mimeType: f.type || 'application/octet-stream', sizeInBytes: f.size,
          storageId: 'legalDocuments', privateUrl: uploaded?.privateUrl || null, publicUrl: uploaded?.publicUrl || null, category: upCategory,
        });
        ok++;
      } catch { toast.error(`No se pudo subir ${f.name}`); }
    }
    setUploading(false); setPending([]); setProgress({}); setUploadOpen(false);
    if (ok) { toast.success(`${ok} documento(s) subido(s)`); setPage(1); await load(); }
  };

  const doDelete = async (d: any) => {
    if (!window.confirm(`¿Eliminar "${d.name}"?`)) return;
    try { await clientService.deleteClientDocument(d.id); toast.success('Documento eliminado'); await load(true); }
    catch { toast.error('No se pudo eliminar'); }
  };

  if (loading && !data) return <div className="p-8 text-sm text-muted-foreground">Cargando documentos…</div>;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold">Biblioteca de documentos</div>
        <Button size="sm" variant="brand" onClick={() => setUploadOpen(true)}><Upload className="mr-1.5 h-4 w-4" /> Subir documento</Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={<Files />} value={kpis.total ?? 0} label="Total de documentos" accent="primary" />
        <Kpi icon={<CalendarPlus />} value={kpis.uploadedThisMonth ?? 0} label="Subidos este mes" accent="green" />
        <Kpi icon={<FolderOpen />} value={kpis.categoriesCount ?? 0} label="Categorías" accent="blue" />
        <Kpi icon={<HardDrive />} value={kpis.storageUsedLabel ?? '0 B'} label={`de ${kpis.capLabel ?? '100 GB'}`} accent="orange" bar={kpis.usedPct ?? 0} sub={<span className="text-xs text-muted-foreground">{kpis.usedPct ?? 0}%</span>} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        {/* LEFT — filters + table */}
        <Section title="Documentos" icon={<Files className="h-4 w-4" />}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={`${inputCls} pl-8`} placeholder="Buscar por nombre, tipo o palabra clave…" value={q} onChange={(e) => resetPage(setQ)(e.target.value)} />
            </div>
            <select className={inputCls} value={category} onChange={(e) => resetPage(setCategory)(e.target.value)}><option value="">Categoría: Todas</option>{categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
            <select className={inputCls} value={type} onChange={(e) => resetPage(setType)(e.target.value)}><option value="">Tipo: Todos</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>

          {docs.length === 0 ? (
            <EmptyState icon={<Files className="h-5 w-5" />} title="Sin documentos" description="Sube el primer documento de este cliente (contratos, manuales, planos…)." action={<Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-1.5 h-4 w-4" /> Subir documento</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Nombre del documento</th>
                    <th className="px-2 py-2 font-medium">Categoría</th>
                    <th className="px-2 py-2 font-medium">Tipo</th>
                    <th className="px-2 py-2 font-medium">Tamaño</th>
                    <th className="px-2 py-2 font-medium">Actualizado por</th>
                    <th className="px-2 py-2 font-medium">Fecha</th>
                    <th className="px-2 py-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => {
                    const tm = typeMeta(d.type); const Icon = tm.icon;
                    return (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tm.color}`}><Icon className="h-4 w-4" /></span>
                            <div className="min-w-0"><div className="font-medium truncate max-w-[220px]">{d.name}</div><div className="text-xs text-muted-foreground">{d.code}</div></div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5"><StatusBadge tone="slate" dot={false}>{d.category}</StatusBadge></td>
                        <td className="px-2 py-2.5">{d.type}</td>
                        <td className="px-2 py-2.5 tabular-nums">{d.sizeLabel}</td>
                        <td className="px-2 py-2.5 truncate max-w-[130px]">{d.uploadedBy}</td>
                        <td className="px-2 py-2.5 tabular-nums text-xs">{fmtDT(d.createdAt)}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex justify-end gap-1">
                            {d.downloadUrl ? <a href={d.downloadUrl} target="_blank" rel="noreferrer" title="Descargar" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Download className="h-3.5 w-3.5" /></a> : <span className="rounded-md p-1.5 text-muted-foreground/40"><Download className="h-3.5 w-3.5" /></span>}
                            <button title="Eliminar" onClick={() => doDelete(d)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Mostrando {total === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, total)} de {total} documentos</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">‹</button>
              {Array.from({ length: Math.min(5, pageCount) }).map((_, k) => { const n = k + 1; return <button key={n} onClick={() => setPage(n)} className={`grid h-7 min-w-[28px] place-items-center rounded-md px-2 text-xs font-semibold ${n === page ? 'bg-primary text-white' : 'border'}`}>{n}</button>; })}
              <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-2 py-1 disabled:opacity-40">›</button>
            </div>
          </div>
        </Section>

        {/* RIGHT — storage + categories + activity */}
        <div className="space-y-4">
          <Section title="Almacenamiento" icon={<HardDrive className="h-4 w-4" />}>
            <div className="flex items-center gap-4">
              {donutSegments.length ? <Donut segments={donutSegments} centerTop={kpis.storageUsedLabel ?? '0 B'} centerBottom="Usado" /> : (
                <div className="grid h-[140px] w-[140px] place-items-center rounded-full border-[15px] border-muted text-center"><div><div className="font-display text-lg font-bold">{kpis.storageUsedLabel ?? '0 B'}</div><div className="text-xs text-muted-foreground">Usado</div></div></div>
              )}
              <div className="flex-1 space-y-2">
                {BREAK_META.map((b) => (
                  <div key={b.key} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />{b.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{breakdown[b.key]?.label ?? '0 B'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>{kpis.storageUsedLabel ?? '0 B'} de {kpis.capLabel ?? '100 GB'}</span><span>{kpis.usedPct ?? 0}%</span></div>
              <div className="h-1.5 w-full rounded-full bg-muted"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(1, Math.min(100, kpis.usedPct ?? 0))}%` }} /></div>
            </div>
          </Section>

          <Section title="Categorías" icon={<FolderOpen className="h-4 w-4" />}>
            {categories.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay categorías.</p> : (
              <div className="divide-y">
                {categories.map((c) => (
                  <button key={c.name} onClick={() => resetPage(setCategory)(c.name)} className="flex w-full items-center justify-between py-2 text-left text-sm hover:text-primary">
                    <span>{c.name}</span><span className="tabular-nums text-muted-foreground">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Actividad reciente" icon={<Clock className="h-4 w-4" />}>
            {activity.length === 0 ? <p className="text-sm text-muted-foreground">Sin actividad reciente.</p> : (
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                    <div><div className="font-medium">{a.user}</div><div className="text-xs text-muted-foreground truncate max-w-[180px]">{a.action} {a.name}</div></div>
                    <span className="shrink-0 text-xs text-muted-foreground">{ago(a.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><HardDrive className="h-3.5 w-3.5" /> Los documentos se almacenan de forma segura y cumplen con los estándares de protección de datos.</span>
        <span className="inline-flex items-center gap-2">{fmtUpdated && <>Última actualización: {fmtUpdated}</>}<button onClick={() => load()} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button></span>
      </div>

      {/* Upload modal */}
      <Modal open={uploadOpen} onOpenChange={(o) => { if (!uploading) setUploadOpen(o); }} title="Subir documento" icon={<Upload className="h-5 w-5" />}
        footer={<><Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</Button><Button onClick={doUpload} disabled={uploading || !pending.length}>{uploading ? 'Subiendo…' : `Subir ${pending.length || ''}`}</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
            <select className={inputCls} value={upCategory} onChange={(e) => setUpCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files); }}
            className="cursor-pointer rounded-xl border-2 border-dashed p-6 text-center hover:border-primary/40">
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-xs text-muted-foreground">PDF, Word, Excel, imágenes, ZIP… (máx. 100 MB)</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
          </div>
          {pending.length > 0 && (
            <div className="space-y-1.5">
              {pending.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="truncate">{f.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">{progress[f.name] != null ? `${progress[f.name]}%` : `${Math.round(f.size / 1024)} KB`}<button onClick={() => setPending((p) => p.filter((_, j) => j !== i))} disabled={uploading}><X className="h-3.5 w-3.5" /></button></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
