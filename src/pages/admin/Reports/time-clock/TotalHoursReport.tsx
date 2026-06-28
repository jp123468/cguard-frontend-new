import AppLayout from '@/layouts/app-layout'
import { Timer } from 'lucide-react'
import { PageContainer, PageHeader, Section, EmptyState } from '@/components/kit'

const TotalHoursReport = () => {
  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Timer />}
          title="Total de horas"
          subtitle="Total de horas registradas en el reloj de control."
        />
        <Section title="Resultados" icon={<Timer />}>
          <EmptyState
            icon={<Timer />}
            title="Sin datos para mostrar"
            description="Ajusta los filtros o el rango de fechas para ver resultados en este informe."
          />
        </Section>
      </PageContainer>
    </AppLayout>
  )
}

export default TotalHoursReport
