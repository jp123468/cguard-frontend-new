import AppLayout from '@/layouts/app-layout'
import SettingsLayout from '@/layouts/SettingsLayout'
import { FileBarChart } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/kit'
import ReportSettingsForm from './ReportSettingsForm'

const ReportSettingsPage = () => {
    return (

        <AppLayout>
            <SettingsLayout navKey="configuracion" title="Configuración de Informes">
                <PageContainer>
                    <PageHeader
                        icon={<FileBarChart />}
                        title="Configuración de Informes"
                        subtitle="Controla la privacidad, el encabezado y el pie de página de los informes exportados."
                    />
                    <ReportSettingsForm />
                </PageContainer>
            </SettingsLayout>
        </AppLayout>
    )
}

export default ReportSettingsPage
