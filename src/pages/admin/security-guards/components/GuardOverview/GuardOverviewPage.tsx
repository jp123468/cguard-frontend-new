import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import GuardSummary from '@/pages/admin/security-guards/components/GuardSummary/GuardSummarypage';
import { useEffect, useState } from 'react';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';

export default function GuardResumenPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .get(id)
      .then((data: any) => {
        if (!mounted) return;
        const g = data.guard ?? data;
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        setGuard({ ...g, fullName });
      })
      .catch((err: any) => {
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
      <GuardsLayout navKey="keep-safe" title="guards.nav.resumen">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Cargando...</div>
          </div>
        ) : guard ? (
          <GuardSummary guard={guard} />
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">No se pudo cargar el guardia</div>
          </div>
        )}
      </GuardsLayout>
    </AppLayout>
  );
}
