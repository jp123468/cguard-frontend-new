import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import GuardSummary from './components/GuardSummary/GuardSummarypage';
import GuardProfile from './components/GuardProfile/GuardProfilepage';
import GuardAvailability from './components/GuardAvailability/GuardAvailabilitypage';
import GuardIndicators from './components/GuardKPIs/GuardKPIspage';
import securityGuardService from '@/lib/api/securityGuardService';
import { ApiService } from '@/services/api/apiService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next'

export default function GuardOverview() {
    const { id, tab } = useParams();
    const { t } = useTranslation()
    const [guard, setGuard] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'Resumen' | 'Perfil' | 'Disponibilidad' | 'Indicadores'>(
        (tab as any) || 'Resumen'
    );

    useEffect(() => {
        if (!id) return;
        let mounted = true;
        setLoading(true);

        (async () => {
            try {
                const data = await securityGuardService.get(id);
                if (!mounted) return;
                const g = data.guard ?? data;
                const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
                // Extract profile image URL from the file-object array returned by the API
                const pi = data.profileImage;
                const photoUrl = Array.isArray(pi)
                  ? (pi[0]?.downloadUrl || pi[0]?.publicUrl || null)
                  : (pi?.downloadUrl || pi?.publicUrl || (typeof pi === 'string' && pi ? pi : null));
                setGuard({ ...g, fullName, profileImage: pi, photoUrl: photoUrl || g.photoUrl || null });
            } catch (err) {
                console.error('Error cargando vigilante (security-guard):', err);
                const status = (err as any) && ((err as any).status || (err as any).response?.status || (err as any).code);

                const tenantId = localStorage.getItem('tenantId') || '';

                // helper to try simple GETs and list queries
                const tryGet = async (path: string) => {
                    try {
                        const resp = await ApiService.get(path, { toast: { silentError: true } } as any);
                        const data = (resp && (resp.data || resp)) || resp;
                        if (!data) return null;
                        if (Array.isArray(data)) return data;
                        if (data.rows && Array.isArray(data.rows) && data.rows.length) return data.rows;
                        return data;
                    } catch (e) {
                        return null;
                    }
                };

                if (status === 404) {
                    try {
                        const candidates = [
                            `/tenant/${tenantId}/security-guard?filter[id]=${encodeURIComponent(id)}&limit=1`,
                            `/tenant/${tenantId}/security-guard?filter[guardId]=${encodeURIComponent(id)}&limit=1`,
                            `/tenant/${tenantId}/security-guard?filter[email]=${encodeURIComponent(id)}&limit=1`,
                        ];

                        for (const p of candidates) {
                            const r = await tryGet(p);
                            if (r) {
                                const row = Array.isArray(r) ? r[0] : (r.rows ? r.rows[0] : r);
                                if (row) {
                                    const g = row.guard ?? row;
                                    const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
                                    const pi2 = row.profileImage;
                                    const photoUrl2 = Array.isArray(pi2) ? (pi2[0]?.downloadUrl || pi2[0]?.publicUrl || null) : (pi2?.downloadUrl || pi2?.publicUrl || null);
                                    if (mounted) setGuard({ ...g, fullName, profileImage: pi2, photoUrl: photoUrl2 || g.photoUrl || null });
                                    return;
                                }
                            }
                        }

                        const tryPaths = [
                            `/tenant/${tenantId}/guard/${encodeURIComponent(id)}`,
                            `/tenant/${tenantId}/user/${encodeURIComponent(id)}`,
                        ];

                        for (const p of tryPaths) {
                            const r = await tryGet(p);
                            if (r) {
                                const g = (Array.isArray(r) ? r[0] : (r.guard ?? r)) || r;
                                const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
                                if (mounted) setGuard({ ...g, fullName });
                                return;
                            }
                        }

                        const broad = await tryGet(`/tenant/${tenantId}/security-guard?limit=999`);
                        if (broad && Array.isArray(broad)) {
                            const match = broad.find((item: any) => {
                                const gid = item.guard?.id || item.id || item.guardId || item.userId || item.value;
                                return String(gid) === String(id);
                            });
                            if (match) {
                                const g = match.guard ?? match;
                                const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
                                const pi3 = match.profileImage;
                                const photoUrl3 = Array.isArray(pi3) ? (pi3[0]?.downloadUrl || pi3[0]?.publicUrl || null) : (pi3?.downloadUrl || pi3?.publicUrl || null);
                                if (mounted) setGuard({ ...g, fullName, profileImage: pi3, photoUrl: photoUrl3 || g.photoUrl || null });
                                return;
                            }
                        }
                    } catch (fallbackErr) {
                        console.error('Fallback fetch error:', fallbackErr);
                    }
                }

                toast.error(t('guards.overview.loadError'));
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [id]);

    return (
        <AppLayout>
            <GuardsLayout navKey="keep-safe" title={t('guards.nav.resumen')}>
                <div className="flex-1 flex flex-col">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-muted-foreground">{t('guards.overview.loading')}</div>
                        </div>
                    ) : guard ? (
                        <>
                            {activeTab === 'Resumen' && <GuardSummary guard={guard} />}
                            {activeTab === 'Perfil' && <GuardProfile guard={guard} />}
                            {activeTab === 'Disponibilidad' && <GuardAvailability guard={guard} />}
                            {activeTab === 'Indicadores' && <GuardIndicators guard={guard} />}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-muted-foreground">No se pudo cargar el vigilante</div>
                        </div>
                    )}
                </div>
            </GuardsLayout>
        </AppLayout>
    );
}
