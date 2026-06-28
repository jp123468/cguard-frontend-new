import AppLayout from '@/layouts/app-layout'
import SettingsLayout from '@/layouts/SettingsLayout'
import NotificationForm from './components/NotificationForm'

const Notification = () => {
  return (
      <AppLayout>
          <SettingsLayout navKey="configuracion" title="Configuración de Notificaciones">
                <NotificationForm />
            </SettingsLayout>
    </AppLayout>
  )
}

export default Notification