export const dynamic = 'force-dynamic'
// ============================================================
// AGENDA PAGE — muestra el calendario con las citas
// Server Component: carga las citas desde Supabase antes de renderizar
// ============================================================

import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { Appointment } from '@/types'
import AgendaSummaryStats from '@/components/agenda/AgendaSummaryStats'
import AgendaTodayList from '@/components/agenda/AgendaTodayList'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cargamos todas las citas del usuario con los datos del paciente incluidos
  // .select('*, patient:patients(*)') hace un JOIN automático de appointments con patients
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('user_id', user!.id)
    .order('fecha_inicio', { ascending: true })

  if (error) {
    console.error('Error cargando citas:', error)
  }

  const allAppointments = (appointments as Appointment[]) ?? []
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const todayAppointments = allAppointments.filter((appointment) => {
    const start = new Date(appointment.fecha_inicio)
    return start >= startOfToday && start <= endOfToday
  })

  const upcomingAppointments = allAppointments
    .filter((appointment) => new Date(appointment.fecha_inicio) > now)
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    .slice(0, 5)

  const nextAppointment = upcomingAppointments[0] ?? null
  const todayCount = todayAppointments.length
  const pendingPaymentCount = allAppointments.filter(
    (appointment) => appointment.estado_sesion === 'asistio' && appointment.estado_pago === 'pendiente'
  ).length
  const pendingSessionCount = allAppointments.filter(
    (appointment) => appointment.estado_sesion === 'pendiente'
  ).length
  const listAppointments = todayCount > 0 ? todayAppointments : upcomingAppointments
  const listVariant = todayCount > 0 ? 'today' as const : 'upcoming' as const

  return (
    <div>
      <div className="mb-8">
        <p className="section-kicker mb-3">Weekly Rhythm</p>
        <h1 className="page-title text-[2.35rem] leading-none">Agenda</h1>
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
