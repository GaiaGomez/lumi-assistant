export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { Appointment } from '@/types'
import { getTodayAppointments } from '@/lib/appointments'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, patient_id, fecha_inicio, fecha_fin, estado_sesion, estado_pago, notas, patient:patients(id, nombre, apellido, whatsapp)')
    .eq('user_id', user.id)
    .order('fecha_inicio', { ascending: true })

  if (error) {
    console.error('Error cargando citas:', error)
  }

  const allAppointments = (appointments as unknown as Appointment[]) ?? []
  const todayCount = getTodayAppointments(allAppointments).length

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="page-title text-[1.6rem] leading-none">Agenda</h1>
        <p className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>
          {todayCount > 0
            ? `${todayCount} cita${todayCount === 1 ? '' : 's'} hoy`
            : 'Sin citas hoy'}
        </p>
      </div>

      <AgendaClient appointments={allAppointments} />
    </div>
  )
}
