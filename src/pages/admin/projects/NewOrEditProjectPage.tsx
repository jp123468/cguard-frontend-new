import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/kit';
import { FolderKanban } from 'lucide-react';
import ProjectForm from './ProjectForm';

export default function NewOrEditProjectPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: 'Panel de control', path: '/dashboard' },
          { label: 'Proyectos', path: '/projects' },
          { label: id ? 'Editar proyecto' : 'Nuevo proyecto' },
        ]}
      />
      <PageContainer width="narrow" className="mt-4">
        <PageHeader
          icon={<FolderKanban />}
          title={id ? 'Editar proyecto' : 'Nuevo proyecto'}
          subtitle={id ? 'Actualiza los datos del proyecto.' : 'Crea un nuevo proyecto y asígnalo a un cliente.'}
        />
        <ProjectForm
          mode={id ? 'edit' : 'create'}
          projectId={id}
        />
      </PageContainer>
    </AppLayout>
  );
}
