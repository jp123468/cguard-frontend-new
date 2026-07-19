import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';

// STUB — filled by the worker-detail rebuild. Shows the guard's rotation
// schedule grid (GET /security-guard/:id/schedule).
export default function GuardHorarioPage() {
  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.horario">
        <div className="mx-auto max-w-5xl py-10 text-center text-sm text-muted-foreground">Horario…</div>
      </GuardsLayout>
    </AppLayout>
  );
}
