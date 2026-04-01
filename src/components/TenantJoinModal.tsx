import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/phone/PhoneInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, Search } from 'lucide-react';
import tenantService from "@/services/tenant.service";
import AddressAutocompleteOSM, { AddressComponents } from "@/components/maps/AddressAutocompleteOSM";
import OSMMapEmbed from "@/components/maps/OSMMapEmbed";
import { AuthService } from "@/services/auth/authService";
import { setTenantId as setClientTenantId } from "@/lib/api/clientService";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { validateCedulaOrRuc } from '@/lib/validators/id';

export default function TenantJoinModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const [mode, setMode] = useState<'join' | 'create'>('join');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const { signInWithToken, user, loading: authLoading } = useAuth();
    const { t } = useTranslation();
    const reopenDelayMs = 25 * 1000; // 25 seconds
    const suppressReopen = useRef(false as boolean);
    const reopenTimer = useRef<number | null>(null);
    const [internalOpen, setInternalOpen] = useState(open);

    // helper to detect tenant presence in various profile shapes
    const profileHasTenant = (u: any) => {
        if (!u) return false;
        if (u.tenant) return Boolean(u.tenant.tenantId || u.tenant.id || (u.tenant.tenant && (u.tenant.tenant.id || u.tenant.tenantId)));
        if (Array.isArray(u.tenants) && u.tenants.length > 0) {
            return u.tenants.some((t: any) => Boolean(t.tenantId || (t.tenant && (t.tenant.id || t.tenant.tenantId))));
        }
        return false;
    };

    useEffect(() => {
        // If parent requests open but the current authenticated user already
        // has a tenant, immediately close the modal and suppress reopen.
        if (open) {
            if (!authLoading && profileHasTenant(user)) {
                try { suppressReopen.current = true; } catch {}
                try { setInternalOpen(false); } catch {}
                try { onOpenChange(false); } catch {}
                return;
            }
            // otherwise reset when opened
            setMode('join'); setToken('');
        }

        // keep internal synced when parent opens/closes externally
        setInternalOpen(open);
    }, [open, user, authLoading]);

    const handleAccept = async () => {
            if (!token) {
            toast.error(t('tenantJoinModal.invitationPlaceholder'));
            return;
        }
        setLoading(true);
        try {
            const resp: any = await tenantService.acceptInvitation(token);
            const tenantId = resp?.tenantId || resp?.data?.tenantId || resp?.data?.id || resp?.id;
            if (tenantId) {
                try { setClientTenantId(String(tenantId)); } catch (e) { }
                try { localStorage.setItem('tenantId', String(tenantId)); } catch { }
            }
            // Refresh profile until backend reflects the new tenant assignment.
            await refreshProfileAndSignIn();
            toast.success('Invitación aceptada. Ya estás vinculado a la empresa');
            // prevent scheduled reopen when closing after successful accept
            try { suppressReopen.current = true; } catch {}
            onOpenChange(false);
            // Give UI a moment to update, then reload so the app fully recognizes tenantId
            try { setTimeout(() => window.location.reload(), 300); } catch {}
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo aceptar la invitación');
        } finally {
            setLoading(false);
        }
    };

        // After accept/create we need to refresh the authenticated user's profile
        // because the backend may not have propagated the tenant->user relationship
        // to the /auth/me endpoint immediately. Retry briefly until the profile
        // shows a tenant for this user, then hydrate the Auth context via
        // `signInWithToken(token, userData)` so UI updates without a manual reload.
        const refreshProfileAndSignIn = async () => {
            const token = localStorage.getItem('authToken') || '';
            const maxAttempts = 6;
            const delayMs = 500;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const profile = await AuthService.getProfile();
                    // detect a tenant in the profile (tenant or tenants array)
                    const tenantPresent = Boolean(
                        (profile && profile.tenant && (profile.tenant.tenantId || (profile.tenant.tenant && profile.tenant.tenant.id))) ||
                        (Array.isArray(profile.tenants) && profile.tenants.length > 0 && (
                            profile.tenants.some((t: any) => Boolean(t.tenantId || (t.tenant && (t.tenant.id || t.tenant.tenantId))))
                        ))
                    );

                    if (tenantPresent) {
                        // hydrate AuthContext with the fresh profile
                        try { await signInWithToken(token, profile); } catch { /* ignore */ }
                        return;
                    }
                } catch (e) {
                    // ignore and retry
                }

                // wait before next attempt
                await new Promise((r) => setTimeout(r, delayMs));
            }

            // final fallback: call signInWithToken without userData (will fetch once)
            try { await signInWithToken(token); } catch (e) { /* ignore */ }
        };

    // Minimal create form state (expanded to match tenants table)
    const [form, setForm] = useState<any>({
        name: '',
        address: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        country: '',
        latitude: '',
        longitude: '',
        phone: '',
        landline: '',
        email: '',
        taxNumber: '',
        businessTitle: '',
    });
    const [showAddressAutocomplete, setShowAddressAutocomplete] = useState(true);
    const [autocompleteOpenQuery, setAutocompleteOpenQuery] = useState('');

    const handleCreate = async () => {
            // Validaciones según especificación del cliente
            const digits = (v: string) => (v || '').toString().replace(/\D/g, '');

            if (!form.name || !form.email || !form.phone || !form.address) {
            toast.error(t('tenantValidations.required_fields'));
            return;
        }

        // name: min6 max30
        if ((form.name || '').trim().length < 6 || (form.name || '').trim().length > 30) {
            toast.error(t('tenantValidations.name_length'));
            return;
        }

        // email: basic validation
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test((form.email || '').trim())) {
            toast.error(t('tenantValidations.email_invalid'));
            return;
        }

        // celular: debe tener 10 dígitos y empezar con 9 o 09
        const mobile = digits(form.phone || '');
        if (mobile.length !== 10 || !(mobile.startsWith('9') || mobile.startsWith('09'))) {
            toast.error(t('tenantValidations.mobile_invalid'));
            return;
        }

        // razón social: max 40 caracteres
        if ((form.businessTitle || '').trim().length > 40) {
            toast.error(t('tenantValidations.business_max'));
            return;
        }

        // tax/RUC: validación centralizada (RUC debe ser 13 dígitos y terminar en 001)
        const taxDigits = digits(form.taxNumber || '');
        if (!validateCedulaOrRuc(taxDigits) || taxDigits.length !== 13) {
            toast.error(t('tenantValidations.tax_invalid'));
            return;
        }

        // landline optional: si presente, debe tener 7 o 9 digitos
        const landDigits = digits(form.landline || '');
        if (landDigits && !(landDigits.length === 7 || landDigits.length === 9)) {
            toast.error(t('tenantValidations.landline_invalid'));
            return;
        }

        setLoading(true);
        try {
            // Build payload matching tenant model
            const payload: any = {
                name: form.name,
                    address: form.address || undefined,
                    addressLine2: form.addressLine2 || undefined,
                    city: form.city || undefined,
                    postalCode: form.postalCode || undefined,
                    country: form.country || undefined,
                    latitude: form.latitude && form.latitude !== '' ? parseFloat(form.latitude) : undefined,
                    longitude: form.longitude && form.longitude !== '' ? parseFloat(form.longitude) : undefined,
                    phone: form.phone || undefined,
                    landline: form.landline || undefined,
                    email: form.email || undefined,
                // Provide defaults for required tenant fields to avoid DB validation errors
                // Use a temporary placeholder for taxNumber if user didn't provide one
                taxNumber: (form.taxNumber && String(form.taxNumber).trim()) || 'PENDING',
                businessTitle: (form.businessTitle && String(form.businessTitle).trim()) || form.name || 'Empresa',
            };

            // If logo file provided, attempt basic upload flow: POST /tenant/file or similar not implemented here.
            // For now, we send logoId if provided; advanced upload should be implemented separately.

            const resp: any = await tenantService.create(payload);
            const tenantId = resp?.id || resp?.data?.id || resp?.tenantId || resp?.data?.tenantId;
            if (tenantId) {
                try { setClientTenantId(String(tenantId)); } catch (e) { }
                try { localStorage.setItem('tenantId', String(tenantId)); } catch (e) { }
            }
            // Refresh profile until backend reflects the new tenant assignment.
            await refreshProfileAndSignIn();
            toast.success('Empresa creada y vinculada correctamente');
            // prevent scheduled reopen when closing after successful create
            try { suppressReopen.current = true; } catch {}
            onOpenChange(false);
            // Refresh the page so the frontend picks up the new tenant context
            try { setTimeout(() => window.location.reload(), 300); } catch {}
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo crear la empresa');
        } finally {
            setLoading(false);
        }
    };

    // Close modal without scheduling a reopen (used for Cancel and internal closes)
    const closeWithoutReopen = () => {
        try { suppressReopen.current = true; } catch {}
        // clear any scheduled reopen and close immediately
        if (reopenTimer.current) {
            clearTimeout(reopenTimer.current);
            reopenTimer.current = null;
        }
        try { setInternalOpen(false); } catch {}
        try { onOpenChange(false); } catch {}
    };

    useEffect(() => {
        // When the local modal state closes (internalOpen -> false) and we did not
        // suppress, schedule a reopen after `reopenDelayMs`. Before scheduling
        // we also ensure the current authenticated user still lacks a tenant;
        // otherwise we should not reopen the modal.
        if (!internalOpen) {
            // If the authenticated user already has a tenant, do not schedule reopen
            if (!authLoading && profileHasTenant(user)) {
                try { suppressReopen.current = true; } catch {}
                if (reopenTimer.current) {
                    clearTimeout(reopenTimer.current);
                    reopenTimer.current = null;
                }
                return;
            }

            if (!suppressReopen.current) {
                // schedule reopen
                reopenTimer.current = window.setTimeout(() => {
                    // before reopening, re-check profile to avoid opening for users
                    // who received a tenant in the meantime
                    try {
                        if (!profileHasTenant(user)) {
                            try { setInternalOpen(true); } catch {}
                            try { onOpenChange(true); } catch {}
                        } else {
                            // if tenant present now, suppress future reopens
                            try { suppressReopen.current = true; } catch {}
                        }
                    } catch (e) {
                        try { setInternalOpen(true); } catch {}
                        try { onOpenChange(true); } catch {}
                    }
                }, reopenDelayMs);
            } else {
                // reset the suppress flag for next interactions
                suppressReopen.current = false;
            }
        } else {
            // opened: clear any scheduled reopen
            if (reopenTimer.current) {
                clearTimeout(reopenTimer.current);
                reopenTimer.current = null;
            }
        }

        return () => {
            if (reopenTimer.current) {
                clearTimeout(reopenTimer.current);
                reopenTimer.current = null;
            }
        };
    }, [internalOpen, user, authLoading]);

    // Intercept dialog open/close events so we can suppress the scheduled
    // reopen when the user explicitly closes the dialog (click outside or ESC).
    // Call `onOpenChange(v)` directly to avoid double-calls and only set the
    // suppress flag when `v` is false (closing).
    const handleDialogOpenChange = (v: boolean) => {
        // Do NOT set `suppressReopen` here — clicks on the X or outside
        // should allow the modal to reopen after `reopenDelayMs`.
        try { setInternalOpen(v); } catch {}
        try { onOpenChange(v); } catch {}
    };

    return (
        <Dialog open={internalOpen} onOpenChange={handleDialogOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg text-center">{t('tenantJoinModal.title')}</DialogTitle>
                    <DialogDescription>{t('tenantJoinModal.description')}</DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <div className="flex gap-3 mb-4">
                        <button className={`px-4 py-2 rounded ${mode === 'join' ? 'bg-black text-white' : 'bg-transparent border'}`} onClick={() => setMode('join')}>{t('tenantJoinModal.joinButton')}</button>
                        <button className={`px-4 py-2 rounded ${mode === 'create' ? 'bg-black text-white' : 'bg-transparent border'}`} onClick={() => setMode('create')}>{t('tenantJoinModal.createButton')}</button>
                    </div>

                    {mode === 'join' ? (
                        <div className="grid gap-3">
                            <Input
                                placeholder={t('tenantJoinModal.invitationPlaceholder')}
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setToken('')} disabled={loading}>{t('actions.cancel') || 'Limpiar'}</Button>
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                                    onClick={handleAccept} disabled={loading}>{t('tenantJoinModal.joinButton') /* reuse join text */}</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm">{t('tenantJoinModal.companyName')}</label>
                                    <Input value={form.name} onChange={(e) => setForm((s: any) => ({ ...s, name: e.target.value }))} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm">{t('tenantJoinModal.contactEmail')}</label>
                                    <Input type="email" value={form.email} onChange={(e) => setForm((s: any) => ({ ...s, email: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm">{t('tenantJoinModal.mobilePhone')}</label>
                                    <PhoneInput value={form.phone} onChange={(v) => setForm((s: any) => ({ ...s, phone: v }))} placeholder="Número móvil" />
                                </div>
                                <div>
                                    <label className="text-sm">{t('tenantJoinModal.landline')}</label>
                                    <Input value={form.landline} onChange={(e) => setForm((s: any) => ({ ...s, landline: e.target.value }))} placeholder="Código + número" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm">{t('tenantJoinModal.businessTitle')}</label>
                                    <Input value={form.businessTitle} onChange={(e) => setForm((s: any) => ({ ...s, businessTitle: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm">{t('tenantJoinModal.taxNumber')}</label>
                                    <Input value={form.taxNumber} onChange={(e) => setForm((s: any) => ({ ...s, taxNumber: e.target.value }))} />
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm">{t('tenantJoinModal.searchAddress')}</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddressAutocomplete(!showAddressAutocomplete)}
                                        className="flex items-center gap-2"
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span>{showAddressAutocomplete ? 'Ingresar dirección manualmente' : 'Volver a búsqueda automática'}</span>
                                    </Button>
                                </div>

                                {showAddressAutocomplete && (
                                    <div>
                                        <AddressAutocompleteOSM
                                            defaultValue={form.address || ''}
                                            openWithQuery={autocompleteOpenQuery}
                                            placeholder="Buscar dirección..."
                                            onAddressSelect={(data: AddressComponents) => {
                                                setForm((s: any) => ({
                                                    ...s,
                                                    address: data.address || s.address,
                                                    city: data.city || s.city,
                                                    postalCode: data.postalCode || s.postalCode,
                                                    country: data.country || s.country,
                                                    latitude: String(data.latitude),
                                                    longitude: String(data.longitude),
                                                }));
                                            }}
                                            showMap={true}
                                        />
                                    </div>
                                )}

                                {/* Se elimina el mapa secundario para evitar duplicidad. Usar el mapa integrado en AddressAutocompleteOSM para seleccionar la dirección. */}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Dirección Complementaria</label>
                                        <Input value={form.addressLine2} onChange={(e) => setForm((s: any) => ({ ...s, addressLine2: e.target.value }))} disabled={showAddressAutocomplete} />
                                    </div>
                                    <div>
                                        <label className="text-sm">Código Postal</label>
                                        <Input value={form.postalCode} onChange={(e) => setForm((s: any) => ({ ...s, postalCode: e.target.value }))} disabled={showAddressAutocomplete} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Ciudad</label>
                                        <Input value={form.city} onChange={(e) => setForm((s: any) => ({ ...s, city: e.target.value }))} disabled={showAddressAutocomplete} />
                                    </div>
                                    <div>
                                        <label className="text-sm">País</label>
                                        <Input value={form.country} onChange={(e) => setForm((s: any) => ({ ...s, country: e.target.value }))} disabled={showAddressAutocomplete} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Latitud</label>
                                        <Input value={form.latitude} onChange={(e) => setForm((s: any) => ({ ...s, latitude: e.target.value }))} disabled={showAddressAutocomplete} />
                                    </div>
                                    <div>
                                        <label className="text-sm">Longitud</label>
                                        <Input value={form.longitude} onChange={(e) => setForm((s: any) => ({ ...s, longitude: e.target.value }))} disabled={showAddressAutocomplete} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-2">
                                <Button variant="ghost" onClick={() => closeWithoutReopen()} disabled={loading}>{t('actions.cancel')}</Button>
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                                    onClick={handleCreate} disabled={loading || !(form.name && form.email && form.phone && form.address && form.taxNumber && form.businessTitle)}>{loading ? t('tenantJoinModal.creating') : t('tenantJoinModal.createAndLink')}</Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter />
            </DialogContent>
        </Dialog>
    );
}
