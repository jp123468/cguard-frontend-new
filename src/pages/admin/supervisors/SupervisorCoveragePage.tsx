import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';

// STUB — filled by the worker-detail rebuild. Shows the supervisor's covered
// zone + stations (GET /supervisors/:userId/coverage) with assign CRUD.
export default function SupervisorCoveragePage() {
  return (
    <AppLayout>
      <GuardsLayout navKey="supervisors" title="Cobertura">
        <div className="mx-auto max-w-5xl py-10 text-center text-sm text-muted-foreground">Cobertura…</div>
      </GuardsLayout>
    </AppLayout>
  );
}
