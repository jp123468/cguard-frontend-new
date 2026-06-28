import AppLayout from '@/layouts/app-layout'
import { Clock4 } from 'lucide-react'
import { PageContainer, PageHeader, Section, EmptyState } from '@/components/kit'

const HoursByReport = () => {
  return (
    <AppLayout>
      <PageContainer width="wide">
        <PageHeader
          icon={<Clock4 />}
          title="Horas por reporte"
          subtitle="Resumen de horas trabajadas agrupadas por reporte."
        />
        <Section title="Resultados" icon={<Clock4 />}>
          <EmptyState
            icon={<Clock4 />}
            title="Sin datos para mostrar"
            description="Ajusta los filtros o el rango de fechas para ver resultados en este informe."
          />
        </Section>
      </PageContainer>
    </AppLayout>
  )
}

export default HoursByReport
