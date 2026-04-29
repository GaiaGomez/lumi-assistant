export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { fetchConsultorios } from '@/lib/consultorios'
import { APPOINTMENT_SELECT, mapAppointmentRows } from '@/lib/supabase/mappers'
import { fetchSettings } from '@/lib/settings'

const AGENDA_RANGE_DAYS = 90

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - AGENDA_RANGE_DAYS)
  const rangeEnd = new Date(now)
  rangeEnd.setDate(rangeEnd.getDate() + AGENDA_RANGE_DAYS)

  const [appointmentsResult, settings, consultorios] = await Promise.all([
    supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('user_id', user.id)
      .gte('fecha_inicio', rangeStart.toISOString())
      .lte('fecha_inicio', rangeEnd.toISOString())
      .order('fecha_inicio', { ascending: true }),
    fetchSettings(supabase, user.id),
    fetchConsultorios(supabase, user.id),
  ])

  if (appointmentsResult.error) throw new Error(`Error cargando citas: ${appointmentsResult.error.message}`)

  const allAppointments = mapAppointmentRows(appointmentsResult.data)

  return (
    <div>
      <div className="mb-4">
        <h1 className="page-title text-[1.6rem] leading-none">Agenda</h1>
      </div>
      <AgendaClient
        appointments={allAppointments}
        consultorios={consultorios}
        settings={settings}
      />
    </div>
  )
}
