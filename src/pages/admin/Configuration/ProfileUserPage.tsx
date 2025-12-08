import AppLayout from '@/layouts/app-layout'
import SettingsLayout from '@/layouts/SettingsLayout'
import ProfileUserForm from './components/ProfileUserForm';

const ProfileUser = () => {
  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title="Perfil del Usuario">
          <ProfileUserForm />
      </SettingsLayout>

    </AppLayout>
  )
}

export default ProfileUser

