import AppLayout from '@/layouts/app-layout'
import SettingsLayout from '@/layouts/SettingsLayout'
import TwoFactorAuthenticationForm from './components/TwoFactorAuthenticationForm'

const TwoFactorAuthentication = () => {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Autenticación de Dos Factores">
        <TwoFactorAuthenticationForm />
      </SettingsLayout>

    </AppLayout>
  )
}

export default TwoFactorAuthentication