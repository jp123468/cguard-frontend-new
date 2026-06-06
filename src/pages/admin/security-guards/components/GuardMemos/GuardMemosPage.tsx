import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FileText, CheckCircle2, Clock, Trash2, X } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { toast } from 'sonner';

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
  const cb: any = m.createdBy;
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
  const [guard, setGuard] = useState<any>(null);
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
      .then((data: any) => {
        if (!mounted) return;
        const g = data.guard ?? data;
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
      const { data: resp } = await api.get<any>(
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
      toast.success(t('guards.memos.created', { defaultValue: 'Memo enviado al guardia' }));
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

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.memos">
        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t('guards.memos.title', { defaultValue: 'Memos' })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('guards.memos.subtitle', { defaultValue: 'Comunicados dirigidos a este guardia.' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('guards.memos.searchPlaceholder', { defaultValue: 'Buscar memo...' })}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-56 pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                  />
                </div>
                <button
                  onClick={() => { setForm({ subject: '', content: '' }); setShowModal(true); }}
                  className="px-5 py-2 bg-[#C8860A] text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-[#B37809] transition-colors whitespace-nowrap"
                >
                  <Plus size={18} />
                  {t('guards.memos.addButton', { defaultValue: 'Nuevo memo' })}
                </button>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t('common.loading', { defaultValue: 'Cargando...' })}
              </p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <FileText size={40} className="text-[#C8860A]/30" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t('guards.memos.empty.title', { defaultValue: 'Sin memos' })}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('guards.memos.empty.message', { defaultValue: 'Este guardia aún no tiene memos.' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((m) => (
                  <div key={m.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{m.subject || '—'}</span>
                          {m.wasAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-700">
                              <CheckCircle2 size={12} /> {t('guards.memos.accepted', { defaultValue: 'Aceptado' })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/15 text-yellow-800">
                              <Clock size={12} /> {t('guards.memos.pending', { defaultValue: 'Pendiente' })}
                            </span>
                          )}
                        </div>
                        {m.content && <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{m.content}</p>}
                        <p className="text-xs text-muted-foreground mt-2">
                          {fmt(m.dateTime || m.createdAt)} · {t('guards.memos.by', { defaultValue: 'por' })} {authorName(m)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-muted-foreground hover:text-red-500 p-1 rounded shrink-0"
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
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowModal(false)}>
            <div
              className="fixed right-0 top-0 bottom-0 w-96 bg-card shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('guards.memos.modal.title', { defaultValue: 'Nuevo memo' })}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {guard?.fullName && (
                  <div className="text-sm text-muted-foreground">
                    {t('guards.memos.modal.to', { defaultValue: 'Para' })}:{' '}
                    <span className="font-medium text-foreground">{guard.fullName}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('guards.memos.form.subject', { defaultValue: 'Asunto' })} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder={t('guards.memos.form.subjectPlaceholder', { defaultValue: 'Asunto del memo' })}
                    className="w-full px-3 py-2 border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('guards.memos.form.content', { defaultValue: 'Contenido' })}
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder={t('guards.memos.form.contentPlaceholder', { defaultValue: 'Escribe el memo...' })}
                    rows={8}
                    className="w-full px-3 py-2 border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#C8860A] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-card">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-foreground border rounded-md hover:bg-muted/30">
                  {t('common.cancel', { defaultValue: 'Cancelar' })}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-6 py-2 bg-[#C8860A] text-white rounded-md font-semibold hover:bg-[#B37809] disabled:opacity-50"
                >
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
