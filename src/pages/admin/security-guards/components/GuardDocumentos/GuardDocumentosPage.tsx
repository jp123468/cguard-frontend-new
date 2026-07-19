import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';

// STUB — filled by the worker-detail rebuild. Real document upload/list/delete
// (GET/POST/DELETE /security-guard/:id/documents + uploadFileToStorage).
export default function GuardDocumentosPage() {
  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.documentos">
        <div className="mx-auto max-w-5xl py-10 text-center text-sm text-muted-foreground">Documentos…</div>
      </GuardsLayout>
    </AppLayout>
  );
}
