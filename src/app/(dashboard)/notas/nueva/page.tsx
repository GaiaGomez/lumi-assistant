export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSessionNote } from '@/lib/notes/actions'
import { createClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ paciente?: string }>
}

export default async function NuevaNota({ searchParams }: Props) {
  const { paciente } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!paciente) redirect('/pacientes')

  const note = await createSessionNote(paciente)
  redirect(`/notas/${note.id}`)
}
