import AppLayout from '@/layouts/app-layout'
import SettingsLayout from '@/layouts/SettingsLayout'
import ProfileCompanyForm from './components/ProfileCompanyForm'

const ProfileCompany = () => {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Perfil de la Empresa">
          <ProfileCompanyForm />
      </SettingsLayout>

    </AppLayout>
  )
}

export default ProfileCompany

