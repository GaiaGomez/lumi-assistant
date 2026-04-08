import { redirect } from 'next/navigation'
import ClinicalNoteEditor from '@/components/historias/ClinicalNoteEditor'
import { fetchSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ paciente?: string }>
}

export default async function NuevaHistoriaPage({ searchParams }: Props) {
  const { paciente } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const settings = await fetchSettings(supabase, user.id)

  return (
    <ClinicalNoteEditor
      mode="create"
      patientId={paciente ?? null}
      initialTextTemplate={settings['historial_plantilla_base'] ?? ''}
    />
  )
}
