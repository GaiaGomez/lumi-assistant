export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { Appointment } from '@/types'

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

  return (
    <div>
      <div className="mb-3">
        <h1 className="page-title text-[1.6rem] leading-none">Agenda</h1>
      </div>
      <AgendaClient appointments={allAppointments} />
    </div>
  )
}
