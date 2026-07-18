import { Section, EmptyState } from '@/components/kit';

/**
 * Placeholder for client sub-pages that are being built out. Each tab gets its
 * own title + icon; the content is filled in as the user specifies what goes
 * into each (Contrato y servicios, Puestos y cobertura, Personal asignado,
 * Operaciones, Incidentes, Reportes, Documentos, Facturación).
 */
export default function ClientTabPlaceholder({ title, description, icon }: { title: string; description?: string; icon?: any }) {
  return (
    <Section title={title} icon={icon}>
      <EmptyState
        icon={icon}
        title={title}
        description={description || 'Esta sección estará disponible pronto.'}
      />
    </Section>
  );
}
