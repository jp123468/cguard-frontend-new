import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';

// STUB — filled by the worker-detail rebuild. Surfaces the real 8-factor
// performance (GuardPerformancePanel via GET /security-guard/:id/performance).
export default function GuardDesempenoPage() {
  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.desempeno">
        <div className="mx-auto max-w-5xl py-10 text-center text-sm text-muted-foreground">Desempeño…</div>
      </GuardsLayout>
    </AppLayout>
  );
}
