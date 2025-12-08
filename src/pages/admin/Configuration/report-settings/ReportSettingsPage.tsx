import AppLayout from '@/layouts/app-layout'
import SettingsLayout from '@/layouts/SettingsLayout'
import ReportSettingsForm from './ReportSettingsForm'

const ReportSettingsPage = () => {
    return (

        <AppLayout>
            <SettingsLayout navKey="configuracion" title="Configuración de Informes">
                <div>
                    <ReportSettingsForm />
                </div>
            </SettingsLayout>
        </AppLayout>
    )
}

export default ReportSettingsPage