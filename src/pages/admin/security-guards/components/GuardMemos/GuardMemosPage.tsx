import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FileText, CheckCircle2, Clock, Trash2, X, Send } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { GuardDetail } from '../../guardDetailTypes';


type Memo = {
  id: string;
  subject?: string;
  content?: string;
  dateTime?: string;
  createdAt?: string;
  wasAccepted?: boolean;
  createdBy?: { firstName?: string; lastName?: string; email?: string } | string;
};

function authorName(m: Memo): string {
  const cb = m.createdBy;
  if (!cb) return '—';
  if (typeof cb === 'string') return cb;
  return `${cb.firstName || ''} ${cb.lastName || ''}`.trim() || cb.email || '—';
}

function fmt(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-ES', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function GuardMemosPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [guard, setGuard] = useState<GuardDetail | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', content: '' });

  const tenantId = localStorage.getItem('tenantId') || '';

  // Load the guard (for the header context).
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    securityGuardService
      .get(id)
      .then((data: (GuardDetail & { firstName?: string; lastName?: string }) | { guard: GuardDetail & { firstName?: string; lastName?: string } }) => {
        if (!mounted) return;
        const g = ('guard' in data && data.guard ? data.guard : data) as GuardDetail & { firstName?: string; lastName?: string };
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        setGuard({ ...g, fullName });
      })
      .catch(() => { /* header just stays sparse */ });
    return () => { mounted = false; };
  }, [id]);

  const loadMemos = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: resp } = await api.get<{ rows?: Memo[] } | Memo[]>(
        `/tenant/${tenantId}/memos?filter[guardName]=${id}&orderBy=dateTime_DESC&limit=200`,
      );
      const rows: Memo[] = Array.isArray(resp) ? resp : (resp?.rows ?? []);
      setMemos(rows);
    } catch {
      toast.error(t('guards.memos.loadError', { defaultValue: 'No se pudieron cargar los memos' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMemos(); /* eslint-disable-next-line */ }, [id]);

  const handleCreate = async () => {
    if (!form.subject.trim()) {
      toast.error(t('guards.memos.subjectRequired', { defaultValue: 'El asunto es obligatorio' }));
      return;
    }
    setSaving(true);
    try {
      await api.post(`/tenant/${tenantId}/memos`, {
        data: {
          subject: form.subject.trim(),
          content: form.content.trim(),
          dateTime: new Date().toISOString(),
          guardName: id,
          wasAccepted: false,
        },
      });
      toast.success(t('guards.memos.created', { defaultValue: 'Memo enviado al vigilante' }));
      setShowModal(false);
      setForm({ subject: '', content: '' });
      await loadMemos();
    } catch (e: any) {
      toast.error(e?.message || t('guards.memos.createError', { defaultValue: 'No se pudo enviar el memo' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (memoId: string) => {
    try {
      await api.delete(`/tenant/${tenantId}/memos?ids[]=${encodeURIComponent(memoId)}`);
      setMemos((prev) => prev.filter((m) => m.id !== memoId));
      toast.success(t('guards.memos.deleted', { defaultValue: 'Memo eliminado' }));
    } catch (e: any) {
      toast.error(e?.message || t('guards.memos.deleteError', { defaultValue: 'No se pudo eliminar' }));
    }
  };

  const filtered = memos.filter((m) => {
    if (!query.trim()) return true;
    const s = query.toLowerCase();
    return (m.subject || '').toLowerCase().includes(s) || (m.content || '').toLowerCase().includes(s);
  });

  const acceptedCount = memos.filter((m) => m.wasAccepted).length;
  const pendingCount = memos.length - acceptedCount;
  const guardInitials = (guard?.fullName || '')
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.memos">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── HERO ─────────────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/40 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-primary/15 to-transparent" />
            <div className="relative p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                {guardInitials ? (
                  <span className="text-base font-bold text-primary">{guardInitials}</span>
                ) : (
                  <FileText size={24} className="text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight truncate">
                  {t('guards.memos.title', { defaultValue: 'Memos' })}
                </h1>
                <p className="text-sm text-muted-foreground truncate">
                  {guard?.fullName
                    ? `${t('guards.memos.subtitle', { defaultValue: 'Comunicados dirigidos a este vigilante.' })} · ${guard.fullName}`
                    : t('guards.memos.subtitle', { defaultValue: 'Comunicados dirigidos a este vigilante.' })}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground/70">
                    <FileText size={12} /> {memos.length} {t('guards.memos.total', { defaultValue: 'memos' })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {acceptedCount} {t('guards.memos.accepted', { defaultValue: 'Aceptado' })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> {pendingCount} {t('guards.memos.pending', { defaultValue: 'Pendiente' })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setForm({ subject: '', content: '' }); setShowModal(true); }}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition whitespace-nowrap shrink-0"
              >
                <Plus size={18} />
                {t('guards.memos.addButton', { defaultValue: 'Nuevo memo' })}
              </button>
            </div>
          </div>

          {/* ── FEED ─────────────────────────────────────────────────────────── */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="font-semibold text-sm tracking-tight">
                {t('guards.memos.feedTitle', { defaultValue: 'Historial de memos' })}
              </h4>
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('guards.memos.searchPlaceholder', { defaultValue: 'Buscar memo...' })}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 text-sm w-56 pl-8"
                />
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border p-4 animate-pulse">
                    <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                    <div className="h-3 w-2/3 bg-muted rounded mb-2" />
                    <div className="h-3 w-1/4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText size={32} className="text-primary/50" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {query.trim()
                      ? t('guards.memos.noResults', { defaultValue: 'Sin resultados' })
                      : t('guards.memos.empty.title', { defaultValue: 'Sin memos todavía' })}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    {query.trim()
                      ? t('guards.memos.noResultsHint', { defaultValue: 'Ningún memo coincide con tu búsqueda.' })
                      : t('guards.memos.empty.message', { defaultValue: 'Este vigilante aún no tiene memos.' })}
                  </p>
                </div>
                {!query.trim() && (
                  <button
                    onClick={() => { setForm({ subject: '', content: '' }); setShowModal(true); }}
                    className="mt-1 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition"
                  >
                    <Plus size={16} />
                    {t('guards.memos.addButton', { defaultValue: 'Nuevo memo' })}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((m) => (
                  <div key={m.id} className="group rounded-xl border p-4 hover:bg-muted/30 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{m.subject || '—'}</span>
                          {m.wasAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-700">
                              <CheckCircle2 size={12} /> {t('guards.memos.accepted', { defaultValue: 'Aceptado' })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-700">
                              <Clock size={12} /> {t('guards.memos.pending', { defaultValue: 'Pendiente' })}
                            </span>
                          )}
                        </div>
                        {m.content && <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-2.5">
                          {fmt(m.dateTime || m.createdAt)} · {t('guards.memos.by', { defaultValue: 'por' })} {authorName(m)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg shrink-0 transition opacity-60 group-hover:opacity-100"
                        aria-label="Delete memo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <div
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Send size={16} className="text-primary" />
                  </div>
                  <h2 className="font-semibold text-sm tracking-tight">
                    {t('guards.memos.modal.title', { defaultValue: 'Nuevo memo' })}
                  </h2>
                </div>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5 flex-1">
                {guard?.fullName && (
                  <div className="rounded-xl border bg-muted/30 px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t('guards.memos.modal.to', { defaultValue: 'Para' })}
                    </div>
                    <div className="font-medium text-sm text-foreground">{guard.fullName}</div>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    {t('guards.memos.form.subject', { defaultValue: 'Asunto' })} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder={t('guards.memos.form.subjectPlaceholder', { defaultValue: 'Asunto del memo' })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    {t('guards.memos.form.content', { defaultValue: 'Contenido' })}
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder={t('guards.memos.form.contentPlaceholder', { defaultValue: 'Escribe el memo...' })}
                    rows={8}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t sticky bottom-0 bg-card">
                <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg border hover:bg-muted transition">
                  {t('common.cancel', { defaultValue: 'Cancelar' })}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? t('common.saving', { defaultValue: 'Enviando...' }) : t('guards.memos.modal.send', { defaultValue: 'Enviar' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}
