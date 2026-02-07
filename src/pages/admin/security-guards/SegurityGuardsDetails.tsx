import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import GuardSummary from './components/GuardSummary/GuardSummarypage';
import GuardProfile from './components/GuardProfile/GuardProfilepage';
import GuardAvailability from './components/GuardAvailability/GuardAvailabilitypage';
import GuardIndicators from './components/GuardKPIs/GuardKPIspage';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';

export default function GuardOverview() {
    const { id, tab } = useParams();
    const [guard, setGuard] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'Resumen' | 'Perfil' | 'Disponibilidad' | 'Indicadores'>(
        (tab as any) || 'Resumen'
    );

    useEffect(() => {
        if (!id) return;
        let mounted = true;
        setLoading(true);
        securityGuardService
            .get(id)
            .then((data) => {
                if (!mounted) return;
                const g = data.guard ?? data;
                const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
                setGuard({ ...g, fullName });
            })
            .catch((err) => {
                console.error('Error cargando guardia:', err);
                toast.error('No se pudo cargar guardia');
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [id]);

    return (
        <AppLayout>
            <GuardsLayout navKey="keep-safe" title="settings.configuracion.keep-safe">
                <div className="flex-1 flex flex-col">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-gray-500">Cargando...</div>
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
                            <div className="text-gray-500">No se pudo cargar el guardia</div>
                        </div>
                    )}
                </div>
            </GuardsLayout>
        </AppLayout>
    );
}
