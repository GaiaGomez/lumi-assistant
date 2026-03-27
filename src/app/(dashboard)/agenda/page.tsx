export const dynamic = 'force-dynamic'
// ============================================================
// AGENDA PAGE — muestra el calendario con las citas
// Server Component: carga las citas desde Supabase antes de renderizar
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { Appointment } from '@/types'
import AgendaSummaryStats from '@/components/agenda/AgendaSummaryStats'
import AgendaTodayList from '@/components/agenda/AgendaTodayList'
import { getTodayAppointments, getNextAppointment, getPendingPayments } from '@/lib/appointments'

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
  const now = new Date()

  const todayAppointments = getTodayAppointments(allAppointments, now)
  const nextAppointment = getNextAppointment(allAppointments, now)
  const todayCount = todayAppointments.length
  const pendingPaymentCount = getPendingPayments(allAppointments).length
  const pendingSessionCount = allAppointments.filter((a) => a.estado_sesion === 'pendiente').length

  const upcomingAppointments = allAppointments
    .filter((a) => new Date(a.fecha_inicio) > now)
    .slice(0, 5)

  const listAppointments = todayCount > 0 ? todayAppointments : upcomingAppointments
  const listVariant = todayCount > 0 ? 'today' as const : 'upcoming' as const

  return (
    <div>
      <div className="mb-8">
        <p className="section-kicker mb-3">Weekly Rhythm</p>
        <h1 className="page-title text-[2rem] leading-none">Agenda</h1>
        <p className="page-subtitle mt-3">
          {todayCount > 0
            ? `${todayCount} cita${todayCount === 1 ? '' : 's'} hoy`
            : 'Sin citas hoy · revisa las próximas'}
        </p>
      </div>

      <AgendaSummaryStats
        todayCount={todayCount}
        nextAppointment={nextAppointment}
        pendingSessionCount={pendingSessionCount}
        pendingPaymentCount={pendingPaymentCount}
      />

      {listAppointments.length > 0 && (
        <AgendaTodayList
          appointments={listAppointments}
          variant={listVariant}
        />
      )}

      {/* AgendaClient es el componente interactivo del calendario */}
      {/* Recibe las citas como prop porque es un Client Component */}
      <AgendaClient appointments={allAppointments} />
    </div>
  )
}
