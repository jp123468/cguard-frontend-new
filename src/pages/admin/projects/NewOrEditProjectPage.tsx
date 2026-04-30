import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import Breadcrumb from '@/components/ui/breadcrumb';
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
      <section className="p-4 max-w-2xl mx-auto mt-4">
        <ProjectForm
          mode={id ? 'edit' : 'create'}
          projectId={id}
        />
      </section>
    </AppLayout>
  );
}
