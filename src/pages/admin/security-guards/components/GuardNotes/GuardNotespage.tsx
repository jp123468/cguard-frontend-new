import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, StickyNote, Calendar, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';
import api from '@/lib/api';

const GOLD = '#C8860A';

type Props = {
    guard?: any;
};

// ── Small presentational helper ─────────────────────────────────────────────
const Section = ({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                {icon && <span className="text-muted-foreground">{icon}</span>}
                <h4 className="font-semibold text-sm tracking-tight">{title}</h4>
            </div>
            {action}
        </div>
        {children}
    </div>
);

// Render a translation string that may contain <br /> markers as real JSX line
// breaks, instead of feeding it through dangerouslySetInnerHTML (no HTML sink).
function renderWithLineBreaks(text: string): React.ReactNode {
    return text.split(/<br\s*\/?>/i).map((part, idx, arr) => (
        <React.Fragment key={idx}>
            {part}
            {idx < arr.length - 1 && <br />}
        </React.Fragment>
    ));
}

function fmtDate(v: any): string {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

export default function GuardNotes({ guard }: Props) {
    const actionRef = useRef<HTMLDivElement>(null);
    const [actionOpen, setActionOpen] = useState(false);
    const [actionSelection, setActionSelection] = useState<string>('default');
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [notesData, setNotesData] = useState<any[]>([]); // Vacío inicialmente
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        attachments: [] as File[],
    });
    const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

    const handleAddNote = () => {
        setShowModal(true);
        setFormData({
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            attachments: [],
        });
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
                setActionOpen(false);
            }
        };

        if (actionOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [actionOpen]);

    const handleSubmitNote = () => {
        // Save note to backend
        (async () => {
            try {
                const payload: any = {
                    title: formData.title,
                    description: formData.description,
                    noteDate: formData.date,
                };

                if (!guard || !guard.id) {
                    toast.error('Guard id missing');
                    return;
                }

                // Upload attachments (pdf/images) to storage and collect metadata
                            const attachments: any[] = [];
                            const files = formData.attachments || [];
                            for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    // Validate mime/type
                    const mime = f.type || '';
                    let storageId = '';
                    if (mime === 'application/pdf') storageId = 'notesPdf';
                    else if (mime.startsWith('image/')) storageId = 'notesImages';
                    else {
                        try { toast.error(t('guards.notes.form.attachments.invalidType', { defaultValue: 'Tipo de archivo no permitido' })); } catch (e) {}
                        continue;
                    }

                    // Validate size (<= 3MB)
                    if (f.size > 3 * 1024 * 1024) {
                        try { toast.error(t('guards.notes.form.attachments.tooLarge', { defaultValue: 'Archivo mayor a 3MB' })); } catch (e) {}
                        continue;
                    }

                    try {
                        // initialize progress and upload with callback to update UI
                        setUploadProgress((prev) => ({ ...prev, [i]: 0 }));
                        const uploaded = await securityGuardService.uploadFileToStorageWithProgress(f, storageId, (p) => {
                            setUploadProgress((prev) => ({ ...prev, [i]: Math.round(p) }));
                        });
                        setUploadProgress((prev) => ({ ...prev, [i]: 100 }));
                        attachments.push(uploaded);
                    } catch (err) {
                        console.error('Upload failed for file', f.name, err);
                        try { toast.error(t('guards.notes.form.attachments.uploadFailed', { defaultValue: 'Fallo al subir archivo' })); } catch (e) {}
                    }
                }

                const tenantId = localStorage.getItem('tenantId');

                // Create the note first (without attachments). We'll create attachment metadata afterwards
                const created = await securityGuardService.createSecurityGuardNote(guard.id, payload);

                // For each uploaded file, create an attachment record linked to the created note
                if (tenantId && attachments.length > 0) {
                    for (const up of attachments) {
                        try {
                            const attPayload: any = {
                                name: up.name,
                                mimeType: up.mimeType || '',
                                sizeInBytes: up.sizeInBytes || up.size || 0,
                                storageId: up.storageId || (up.mimeType === 'application/pdf' ? 'notesPdf' : 'notesImages'),
                                // send encrypted token instead of raw privateUrl when available
                                fileToken: up.fileToken || null,
                                publicUrl: up.publicUrl || null,
                                notableType: 'note',
                                notableId: created.id,
                            };

                            await api.post(`/tenant/${tenantId}/attachments`, attPayload);
                        } catch (err) {
                            console.error('Failed to create attachment metadata', err);
                            try { toast.error(t('guards.notes.form.attachments.metadataCreateFailed', { defaultValue: 'Fallo al guardar metadata del archivo' })); } catch (e) {}
                        }
                    }
                }

                // Backend returns the created note object
                setNotesData((prev) => [created, ...prev]);
                try { toast.success(t('guards.notes.noteCreated', { defaultValue: 'Nota creada correctamente' })); } catch (e) {}
                setShowModal(false);
                setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], attachments: [] });
                setUploadProgress({});
            } catch (err: any) {
                try { toast.error(t('guards.notes.noteCreateFailed', { defaultValue: 'No se pudo crear la nota' })); } catch (e) {}
                console.error('Failed to create note', err);
            }
        })();
    };

    // Load notes for guard
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!guard || !guard.id) return;
            try {
                const resp: any = await securityGuardService.getSecurityGuardNotes(guard.id);
                // resp may be { rows, count } or an array
                const items = resp?.rows ?? resp ?? [];
                if (mounted) setNotesData(items);
            } catch (err) {
                console.error('Failed to load guard notes', err);
                try { toast.error(t('guards.notes.loadError', { defaultValue: 'Error al cargar notas' })); } catch (e) {}
            }
        })();
        return () => { mounted = false; };
    }, [guard?.id]);

    const removeAttachment = (index: number) => {
        setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
    };

    const shortName = (name: string, max = 28) => {
        if (name.length <= max) return name;
        return name.slice(0, max) + '...';
    };

    // ── Derived: filtered feed ──────────────────────────────────────────────
    const q = searchQuery.trim().toLowerCase();
    const filteredNotes = !q
        ? notesData
        : notesData.filter((n: any) => {
            const hay = [n?.title, n?.description, n?.addedBy].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });

    return (
        <AppLayout>
            <GuardsLayout navKey="keep-safe" title="guards.nav.notas">
                <div className="mx-auto max-w-5xl space-y-6">

                    <Section
                        title={t('guards.notes.sectionTitle', { defaultValue: 'Notas' })}
                        icon={<StickyNote size={16} />}
                        action={
                            <div className="flex items-center gap-2">
                                {/* Action dropdown (preserved) */}
                                <div className="relative" ref={actionRef}>
                                    <button
                                        onClick={() => setActionOpen(!actionOpen)}
                                        className="hidden h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:flex"
                                    >
                                        {t(`guards.notes.actions.${actionSelection}`, { defaultValue: actionSelection === 'default' ? 'Acciones' : actionSelection })}
                                    </button>
                                    {actionOpen && (
                                        <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border bg-card shadow-lg">
                                            <button
                                                onClick={() => { setActionSelection('delete'); setActionOpen(false); }}
                                                className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted"
                                            >
                                                {t('guards.notes.actions.delete', { defaultValue: 'Eliminar' })}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Add note */}
                                <button
                                    onClick={handleAddNote}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                                    style={{ background: GOLD }}
                                >
                                    <Plus size={16} />
                                    {t('guards.notes.addButton', { defaultValue: 'Agregar nota' })}
                                </button>
                            </div>
                        }
                    >
                        {/* Search */}
                        <div className="relative mb-5 max-w-sm">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={t('guards.notes.searchPlaceholder', { defaultValue: 'Buscar nota' }) as string}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-9 text-sm"
                            />
                        </div>

                        {/* Notes feed */}
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                                    <StickyNote size={26} className="text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {q
                                            ? t('guards.notes.empty.title', { defaultValue: 'Sin resultados' })
                                            : t('guards.notes.empty.none', { defaultValue: 'Sin notas todavía' })}
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {q
                                            ? renderWithLineBreaks(t('guards.notes.empty.message', { defaultValue: 'No encontramos<br />notas que coincidan<br />con tu búsqueda' }))
                                            : t('guards.notes.empty.hint', { defaultValue: 'Crea la primera nota para este vigilante.' })}
                                    </p>
                                </div>
                                {!q && (
                                    <button
                                        onClick={handleAddNote}
                                        className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                                        style={{ background: GOLD }}
                                    >
                                        <Plus size={16} />
                                        {t('guards.notes.addButton', { defaultValue: 'Agregar nota' })}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {filteredNotes.map((note: any, idx: number) => {
                                    const author = note?.addedBy || note?.createdBy?.fullName || '';
                                    const when = fmtDate(note?.noteDate ?? note?.date ?? note?.createdAt);
                                    return (
                                        <li
                                            key={note?.id ?? idx}
                                            className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-foreground/20 hover:shadow"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                                                    style={{ background: GOLD }}
                                                >
                                                    {initials(author)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h5 className="truncate text-sm font-semibold tracking-tight text-foreground">
                                                            {note?.title || t('guards.notes.untitled', { defaultValue: 'Sin título' })}
                                                        </h5>
                                                        {when && (
                                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                <Calendar size={11} />
                                                                {when}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {note?.description && (
                                                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                                            {note.description}
                                                        </p>
                                                    )}
                                                    {author && (
                                                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                            <User size={11} />
                                                            {author}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Section>

                    {/* Modal */}
                    {showModal && (
                        <div
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                            onClick={handleCloseModal}
                        >
                            <div
                                className="fixed right-0 top-0 bottom-0 flex w-full max-w-md flex-col bg-card shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between border-b px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground"><StickyNote size={18} /></span>
                                        <h2 className="text-base font-semibold tracking-tight text-foreground">{t('guards.notes.modal.title', { defaultValue: 'Agregar nota' })}</h2>
                                    </div>
                                    <button
                                        onClick={handleCloseModal}
                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        aria-label={t('guards.notes.modal.cancel', { defaultValue: 'Cancelar' }) as string}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                                    {/* Título */}
                                    <div>
                                        <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {t('guards.notes.form.title.label', { defaultValue: 'Título' })} <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder={t('guards.notes.form.title.placeholder', { defaultValue: 'Ingresa el título de la nota' }) as string}
                                            className="h-9 text-sm"
                                        />
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                        <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {t('guards.notes.form.description.label', { defaultValue: 'Descripción' })} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder={t('guards.notes.form.description.placeholder', { defaultValue: 'Ingresa la descripción de la nota' }) as string}
                                            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            rows={6}
                                        />
                                    </div>

                                    {/* Fecha */}
                                    <div>
                                        <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {t('guards.notes.form.date.label', { defaultValue: 'Fecha' })} <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="h-9 cursor-pointer text-sm"
                                        />
                                    </div>

                                    {/* Attachments */}
                                    <div>
                                        <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">{t('guards.notes.form.attachments.label', { defaultValue: 'Adjuntos' })}</label>

                                        <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed p-3 transition-colors hover:border-foreground/30">
                                            <div className="flex-1">
                                                <div className="text-sm text-foreground/70">
                                                    {formData.attachments && formData.attachments.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {formData.attachments.map((f, i) => (
                                                                <div key={i} className="flex w-full flex-col gap-2">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex items-center gap-3 truncate">
                                                                            <span className="truncate text-sm font-medium text-foreground" style={{maxWidth: 200}} title={f.name}>{shortName(f.name, 28)}</span>
                                                                        </div>
                                                                        <button onClick={(e) => { e.stopPropagation(); removeAttachment(i); }} className="rounded p-1 text-muted-foreground transition-colors hover:text-red-500" aria-label={`Remove ${f.name}`}>
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                    {/* Progress Bar */}
                                                                    {typeof uploadProgress[i] !== 'undefined' && (
                                                                        <div className="h-2 w-full overflow-hidden rounded bg-muted">
                                                                            <div className="h-2" style={{ width: `${uploadProgress[i]}%`, background: GOLD }} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Plus size={14} />
                                                            {t('guards.notes.form.attachments.noFiles', { defaultValue: 'Ningún archivo seleccionado' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files ? Array.from(e.target.files) : [];
                                                    setFormData({ ...formData, attachments: files });
                                                }}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 border-t px-6 py-5">
                                    <button
                                        onClick={handleCloseModal}
                                        className="h-9 rounded-lg border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
                                    >
                                        {t('guards.notes.modal.cancel', { defaultValue: 'Cancelar' })}
                                    </button>
                                    <button
                                        onClick={handleSubmitNote}
                                        className="h-9 rounded-lg px-5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                                        style={{ background: GOLD }}
                                    >
                                        {t('guards.notes.modal.save', { defaultValue: 'Guardar' })}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </GuardsLayout>
        </AppLayout>
    );
}
