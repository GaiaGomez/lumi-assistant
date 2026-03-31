export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { mapAppointmentRows } from '@/lib/supabase/mappers'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('user_id', user.id)
    .order('fecha_inicio', { ascending: true })

  // Si hay error de Supabase, lo lanzamos para que lo capture el error.tsx más cercano.
  // Antes solo se logueaba → agenda aparecía vacía sin explicación para Lu.
  if (error) throw new Error(`Error cargando citas: ${error.message}`)

  const allAppointments = mapAppointmentRows(appointments)

  return (
    <div>
      <div className="mb-3">
        <h1 className="page-title text-[1.6rem] leading-none">Agenda</h1>
      </div>
      <AgendaClient appointments={allAppointments} />
    </div>
  )
}
