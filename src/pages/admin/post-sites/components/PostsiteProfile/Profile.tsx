import React, { useEffect, useState, useRef, RefObject } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import IncidentMap from "@/components/IncidentMap/IncidentMap";
import { categoryService } from '@/lib/api/categoryService';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { ServiceTypeBadge } from '@/components/post-sites/ServiceTypeBadge';
import { postSiteService } from '@/lib/api/postSiteService';
import { stationService } from '@/lib/api/stationService';
import { toast } from 'sonner';
import { MapPin, Phone, Mail, Building2, Globe, Tag, Pencil, Check, X, DollarSign, Shield, ShieldCheck, ShieldOff, Clock, UserCircle2 } from 'lucide-react';

function formatDate(d?: string) {
    if (!d) return '-';
    try {
        return new Date(d).toLocaleDateString();
    } catch {
        return d;
    }
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value || '-'}</span>
    </div>
);

const RateRow = ({
    label, value, editing, saving,
    inputRef, onChange,
    onEdit, onSave, onCancel,
}: {
    label: string; value: string; editing: boolean; saving: boolean;
    inputRef: RefObject<HTMLInputElement>;
    onChange: (v: string) => void;
    onEdit: () => void; onSave: () => void; onCancel: () => void;
}) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {editing ? (
            <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
                    className="w-32 text-sm border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    disabled={saving}
                    placeholder="0.00"
                />
                <button onClick={onSave} disabled={saving} className="p-1 rounded hover:bg-green-500/10 text-green-600 disabled:opacity-40">
                    <Check size={14} />
                </button>
                <button onClick={onCancel} disabled={saving} className="p-1 rounded hover:bg-red-500/10 text-red-500 disabled:opacity-40">
                    <X size={14} />
                </button>
            </div>
        ) : (
            <div className="flex items-center gap-1.5 group">
                <span className="text-sm font-semibold text-foreground">
                    {value ? `$${parseFloat(value).toFixed(2)}` : '-'}
                </span>
                <button
                    onClick={onEdit}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                    title="Edit"
                >
                    <Pencil size={11} className="text-muted-foreground" />
                </button>
            </div>
        )}
    </div>
);

export default function PostSiteProfile({ site }: { site?: any }) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement | null>(null);
    useScrollToTopOnMount(containerRef);
    const { id } = useParams<{ id: string }>();

    const clientName = site?.client?.name || site?.clientAccount?.name || site?.clientAccountName || '-';
    const siteName = site?.companyName || site?.name || '-';
    const addedOn = formatDate(site?.createdAt || site?.created_at || site?.created_date);
    const address = site?.address || site?.secondAddress || '-';
    const client = site?.client || site?.clientAccount;
    const contactPhone = site?.contactPhone || site?.phone || site?.contact_phone || client?.phoneNumber || client?.phone || '-';
    const contactEmail = site?.contactEmail || site?.email || site?.contact_email || client?.email || '-';
    const fax = site?.fax || '-';

    // Inline-editable rates
    const [chargeRate, setChargeRate] = useState<string>('');
    const [payRate, setPayRate] = useState<string>('');
    const [editingCharge, setEditingCharge] = useState(false);
    const [editingPay, setEditingPay] = useState(false);
    const [savingCharge, setSavingCharge] = useState(false);
    const [savingPay, setSavingPay] = useState(false);
    const chargeInputRef = useRef<HTMLInputElement>(null);
    const payInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setChargeRate(site?.chargeRate != null ? String(site.chargeRate) : '');
        setPayRate(site?.payRate != null ? String(site.payRate) : '');
    }, [site]);

    useEffect(() => { if (editingCharge) chargeInputRef.current?.focus(); }, [editingCharge]);
    useEffect(() => { if (editingPay) payInputRef.current?.focus(); }, [editingPay]);

    const saveRate = async (field: 'chargeRate' | 'payRate', value: string, setSaving: (v: boolean) => void, setEditing: (v: boolean) => void) => {
        if (!id) return;
        setSaving(true);
        try {
            const numVal = value.trim() === '' ? null : parseFloat(value);
            await postSiteService.update(id, { [field]: numVal } as any);
            toast.success(t('postSites.profile.rateSaved', 'Rate saved'));
            setEditing(false);
        } catch {
            toast.error(t('postSites.profile.rateSaveError', 'Failed to save rate'));
        } finally {
            setSaving(false);
        }
    };

    const [categoryNames, setCategoryNames] = useState<string[] | null>(null);
    const [activeStatus, setActiveStatus] = useState<any>(null);
    const [activeStatusLoading, setActiveStatusLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function loadCategoryNames() {
            try {
                if (site?.categoryNames && Array.isArray(site.categoryNames) && site.categoryNames.length) {
                    if (mounted) setCategoryNames(site.categoryNames.map(String));
                    return;
                }
                const ids = site?.categoryIds;
                if (!ids || !Array.isArray(ids) || ids.length === 0) {
                    if (mounted) setCategoryNames([]);
                    return;
                }
                const resp = await categoryService.list({ filter: { module: 'postSite' }, limit: 1000 });
                const map = new Map<string, string>();
                (resp.rows || []).forEach((c: any) => map.set(String(c.id), c.name));
                const names = ids.map((id: any) => map.get(String(id)) || String(id));
                if (mounted) setCategoryNames(names);
            } catch (e) {
                if (mounted) setCategoryNames((site?.categoryNames && Array.isArray(site.categoryNames)) ? site.categoryNames.map(String) : []);
            }
        }
        loadCategoryNames();
        return () => { mounted = false; };
    }, [site]);

    // Fetch active status (stations + on-duty guards)
    useEffect(() => {
        if (!id) return;
        let mounted = true;
        setActiveStatusLoading(true);
        stationService.activeStatus(id)
            .then(data => { if (mounted) setActiveStatus(data); })
            .catch(() => { /* silently ignore */ })
            .finally(() => { if (mounted) setActiveStatusLoading(false); });
        return () => { mounted = false; };
    }, [id]);

    const categories = (() => {
        if (Array.isArray(site?.categories) && site.categories.length > 0)
            return site.categories.map((c: any) => c?.name || c?.label || c?.title || String(c)).join(', ');
        if (categoryNames && categoryNames.length) return categoryNames.join(', ');
        if (Array.isArray(site?.categoryNames) && site.categoryNames.length > 0) return site.categoryNames.join(', ');
        if (Array.isArray(site?.categoryIds) && site.categoryIds.length > 0) {
            if (site.categoryLookup && typeof site.categoryLookup === 'object')
                return site.categoryIds.map((id: any) => site.categoryLookup[id] ?? id).join(', ');
            return site.categoryIds.join(', ');
        }
        return '-';
    })();

    const postalCode = site?.postalCode || site?.zipCode || '-';
    const city = site?.city || '-';
    const country = site?.country || '-';

    // Images from client account
    const logoArr = client?.logoUrl;
    const logoImgUrl = Array.isArray(logoArr) && logoArr.length > 0
        ? (logoArr[0].downloadUrl || logoArr[0].publicUrl || null) : null;
    const placeArr = client?.placePictureUrl;
    const placePicImgUrl = Array.isArray(placeArr) && placeArr.length > 0
        ? (placeArr[0].downloadUrl || placeArr[0].publicUrl || null) : null;

    // Map coordinates
    const mapLat = site?.latitud ?? site?.latitude ?? site?.lat ?? (site?.location && site.location.lat);
    const mapLng = site?.longitud ?? site?.longitude ?? site?.lng ?? (site?.location && site.location.lng);
    const mapAddress = site?.address || site?.secondAddress || site?.companyAddress || '';
    const mapLatNum = mapLat ? Number(mapLat) : NaN;
    const mapLngNum = mapLng ? Number(mapLng) : NaN;

    return (
        <div ref={containerRef} className="space-y-0">
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">

                {/* ── Cover photo ─────────────────────────────────────────── */}
                <div className="relative h-64 md:h-80 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                    {placePicImgUrl ? (
                        <img src={placePicImgUrl} alt={siteName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Building2 size={64} className="text-muted-foreground/60" />
                        </div>
                    )}
                    {id && (
                        <Link
                            to={`/post-sites/${id}/edit`}
                            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-card text-foreground rounded-full text-xs font-semibold shadow transition"
                        >
                            <Pencil size={12} />
                            {t('postSites.profile.Edit', 'Editar')}
                        </Link>
                    )}
                </div>

                {/* ── Identity strip ──────────────────────────────────────── */}
                <div className="px-6 pb-6 relative z-10">
                    {/* Logo sits on the border just below the cover */}
                    <div className="flex items-center gap-4 mt-4 mb-5">
                        <div className="flex-shrink-0 w-16 h-16 rounded-xl border-4 border-white shadow-md overflow-hidden bg-card">
                            {logoImgUrl ? (
                                <img src={logoImgUrl} alt={clientName} className="w-full h-full object-contain p-1" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Building2 size={26} className="text-muted-foreground/60" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold text-foreground leading-tight">{siteName}</h2>
                                <ServiceTypeBadge value={site?.serviceType} size="md" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{clientName}</p>
                        </div>
                    </div>

                    {site?.description && (
                        <p className="text-sm text-foreground/70 mb-5 leading-relaxed">{site.description}</p>
                    )}

                    {/* ── Three info cards ───────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* General Information */}
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('postSites.profile.GeneralInformation.title')}</h4>
                            <InfoRow label={t('postSites.profile.GeneralInformation.client')} value={clientName} />
                            <InfoRow label={t('postSites.profile.GeneralInformation.siteName')} value={siteName} />
                            <InfoRow label={t('postSites.profile.GeneralInformation.addedOn')} value={addedOn} />
                            <InfoRow
                                label={t('postSites.profile.GeneralInformation.address')}
                                value={address !== '-' ? (
                                    <span className="flex items-start gap-1">
                                        <MapPin size={13} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                                        {address}
                                    </span>
                                ) : '-'}
                            />
                        </div>

                        {/* Contact Details */}
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('postSites.profile.ContactDetails.title')}</h4>
                            <InfoRow
                                label={t('postSites.profile.ContactDetails.phoneNumber')}
                                value={contactPhone !== '-' ? (
                                    <a href={`tel:${contactPhone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                        <Phone size={12} />{contactPhone}
                                    </a>
                                ) : '-'}
                            />
                            <InfoRow
                                label={t('postSites.profile.ContactDetails.email')}
                                value={contactEmail !== '-' ? (
                                    <a href={`mailto:${contactEmail}`} className="flex items-center gap-1 text-blue-600 hover:underline break-all">
                                        <Mail size={12} />{contactEmail}
                                    </a>
                                ) : '-'}
                            />
                            <InfoRow label={t('postSites.profile.ContactDetails.fax')} value={fax} />
                        </div>

                        {/* More Information + Rates */}
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('postSites.profile.MoreInformation.title')}</h4>
                            {categories !== '-' && (
                                <InfoRow
                                    label={t('postSites.profile.MoreInformation.categories')}
                                    value={<span className="flex items-center gap-1"><Tag size={12} className="text-muted-foreground" />{categories}</span>}
                                />
                            )}
                            <InfoRow label={t('postSites.profile.MoreInformation.city')} value={
                                <span className="flex items-center gap-1">
                                    {city !== '-' && <Globe size={12} className="text-muted-foreground" />}
                                    {[city, country].filter(v => v && v !== '-').join(', ') || '-'}
                                </span>
                            } />
                            <InfoRow label={t('postSites.profile.MoreInformation.postalCode')} value={postalCode} />

                            <div className="pt-1 border-t border-border space-y-3">
                                <RateRow
                                    label={t('postSites.profile.MoreInformation.postSiteChargeRate')}
                                    value={chargeRate}
                                    editing={editingCharge}
                                    saving={savingCharge}
                                    inputRef={chargeInputRef}
                                    onChange={setChargeRate}
                                    onEdit={() => setEditingCharge(true)}
                                    onSave={() => saveRate('chargeRate', chargeRate, setSavingCharge, setEditingCharge)}
                                    onCancel={() => { setChargeRate(site?.chargeRate != null ? String(site.chargeRate) : ''); setEditingCharge(false); }}
                                />
                                <RateRow
                                    label={t('postSites.profile.MoreInformation.postSitePayRate')}
                                    value={payRate}
                                    editing={editingPay}
                                    saving={savingPay}
                                    inputRef={payInputRef}
                                    onChange={setPayRate}
                                    onEdit={() => setEditingPay(true)}
                                    onSave={() => saveRate('payRate', payRate, setSavingPay, setEditingPay)}
                                    onCancel={() => { setPayRate(site?.payRate != null ? String(site.payRate) : ''); setEditingPay(false); }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Map ─────────────────────────────────────────────────── */}
                <div className="border-t">
                    {!isNaN(mapLatNum) && !isNaN(mapLngNum) ? (
                        <div className="h-64">
                            <IncidentMap lat={mapLatNum} lng={mapLngNum} label={siteName} />
                        </div>
                    ) : mapAddress ? (
                        <div className="h-20 flex items-center justify-center gap-3 text-sm text-muted-foreground bg-muted/30">
                            <MapPin size={16} className="text-muted-foreground" />
                            <span>{t('postSites.profile.Map.NoCoordinates')}</span>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`}
                                target="_blank" rel="noreferrer"
                                className="text-blue-600 underline"
                            >Open in Google Maps</a>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* ── Stations & On-Duty Guards ────────────────────────────────── */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden mt-4">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield size={16} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Estaciones de Servicio</h3>
                    </div>
                    {activeStatusLoading && (
                        <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
                    )}
                </div>

                {!activeStatus || !activeStatus.stations || activeStatus.stations.length === 0 ? (
                    <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                        {activeStatusLoading ? 'Cargando estaciones...' : 'No hay estaciones registradas para este sitio.'}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {activeStatus.stations.map((station: any) => (
                            <div key={station.id} className="px-6 py-4">
                                {/* Station header */}
                                <div className="flex items-center gap-2 mb-3">
                                    {station.isActive ? (
                                        <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
                                    ) : (
                                        <ShieldOff size={16} className="text-muted-foreground flex-shrink-0" />
                                    )}
                                    <span className="font-semibold text-foreground text-sm">{station.stationName}</span>
                                    <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${station.isActive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                        {station.isActive ? 'Activo' : 'Sin cobertura'}
                                    </span>
                                </div>

                                {/* Active guards grid */}
                                {station.isActive && station.activeGuards.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {station.activeGuards.map((guard: any) => (
                                            <div key={guard.id} className="flex flex-col items-center gap-1.5 bg-emerald-500/10 border border-emerald-100 rounded-xl p-3">
                                                {guard.photoUrl ? (
                                                    <img
                                                        src={guard.photoUrl}
                                                        alt={guard.fullName}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center">
                                                        <UserCircle2 size={26} className="text-emerald-600" />
                                                    </div>
                                                )}
                                                <span className="text-xs font-semibold text-foreground text-center leading-tight">{guard.fullName}</span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    En turno
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* No active guards — show next shift */}
                                {!station.isActive && (
                                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg px-4 py-3 mt-1">
                                        <Clock size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                                        {station.nextShift ? (
                                            <div className="text-sm text-foreground/70">
                                                <span className="block text-xs text-muted-foreground mb-0.5">Próximo turno</span>
                                                <span className="font-semibold text-foreground">
                                                    {new Date(station.nextShift.startTime).toLocaleString('es', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {station.nextShift.guard && (
                                                    <span className="text-muted-foreground"> · {station.nextShift.guard.fullName}</span>
                                                )}
                                                <span className="text-muted-foreground text-xs ml-1">
                                                    hasta {new Date(station.nextShift.endTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Sin turnos programados en los próximos 7 días.</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

