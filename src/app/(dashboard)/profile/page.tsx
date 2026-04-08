export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import PageBlobs from '@/components/ui/PageBlobs'
import PageHeader from '@/components/ui/PageHeader'
import ProfileClient from '@/components/profile/ProfileClient'
import { createClient } from '@/lib/supabase/server'
import { fetchSettings } from '@/lib/settings'
import { resolveProfileIdentity } from '@/lib/profile'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const settings = await fetchSettings(supabase, user.id)
  const identity = resolveProfileIdentity(user, settings)

  return (
    <div className="relative mx-auto max-w-[760px] pb-1">
      <PageBlobs />

      <div className="relative">
        <PageHeader
          kicker="Cuenta"
          title="Mi perfil"
          subtitle="Edita la identidad que Lumi muestra en tu espacio de trabajo."
        />

        <ProfileClient userId={user.id} identity={identity} />
      </div>
    </div>
  )
}
