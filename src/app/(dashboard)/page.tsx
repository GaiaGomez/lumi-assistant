import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getTodayAppointments,
  getPendingClinicalCounts,
  getWeeklySummary,
} from '@/lib/dashboard/clinical-dashboard'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [todayAppointments, pendingCounts, weeklySummary] = await Promise.all([
    getTodayAppointments(user.id),
    getPendingClinicalCounts(user.id),
    getWeeklySummary(user.id),
  ])

  const getStateBadgeStatus = (state: string): 'success' | 'pending' | 'cancel' | 'warning' | 'inactive' => {
    switch (state) {
      case 'realizada':
        return 'success'
      case 'confirmada':
        return 'pending'
      case 'cancelo':
        return 'cancel'
      case 'pendiente':
        return 'warning'
      default:
        return 'pending'
    }
  }

  const getStateLabelText = (state: string) => {
    switch (state) {
      case 'realizada':
        return 'Realizada'
      case 'confirmada':
        return 'Confirmada'
      case 'cancelo':
        return 'Cancelada'
      case 'pendiente':
        return 'Pendiente'
      default:
        return 'Pendiente'
    }
  }

  const allPendingsAreZero =
    pendingCounts.unsignedNotes === 0 &&
    pendingCounts.pendingConsent === 0 &&
    pendingCounts.patientsNoNextAppointment === 0 &&
    pendingCounts.incompleteData === 0 &&
    pendingCounts.completedNoNote === 0

  return (
    <main className="dashboard-shell-main flex-1 lg:ml-64 min-h-screen">
      <div className="px-6 py-8 space-y-8">
        {/* Header */}
        <PageHeader kicker="Hoy" title="Dashboard clínico" />

        {/* 1. HOY — Today's Appointments */}
        <Card radius="lg" className="glass-cool">
          <div className="space-y-4">
            <h2 className="editorial-panel-title text-[1.05rem] font-serif text-ink-cool-strong">
              Hoy
            </h2>

            {todayAppointments.length === 0 ? (
              <p className="text-[14px] text-ink-cool-soft py-4">
                No hay citas programadas para hoy
              </p>
            ) : (
              <div className="space-y-1.5">
                {todayAppointments.map((item) => {
                  const startTime = new Date(item.appointment.fecha_inicio)
                  const timeStr = startTime.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'America/Bogota',
                  })

                  const patientName = item.appointment.patient
                    ? `${item.appointment.patient.nombre} ${item.appointment.patient.apellido}`
                    : 'Sin paciente'

                  const patientId = item.appointment.patient_id

                  return (
                    <div
                      key={item.appointment.id}
                      className="flex items-center justify-between p-3 rounded-md bg-ink-cool-faint/30"
                    >
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-ink-cool-strong">
                          {timeStr} — {patientName}
                        </p>
                        <div className="mt-2">
                          <Badge
                            status={getStateBadgeStatus(
                              item.appointment.estado_sesion
                            )}
                          >
                            {getStateLabelText(item.appointment.estado_sesion)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {patientId && (
                          <>
                            <Link
                              href={`/notas/nueva?paciente=${patientId}`}
                              passHref
                            >
                              <Button variant="action">
                                Crear nota
                              </Button>
                            </Link>
                            <Link href={`/pacientes/${patientId}`} passHref>
                              <Button variant="ghost">
                                Ver paciente
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* 2. PENDIENTES CLÍNICOS — Pending Clinical Items */}
        <Card radius="lg" className="glass-cool">
          <div className="space-y-4">
            <h2 className="editorial-panel-title text-[1.05rem] font-serif text-ink-cool-strong">
              Pendientes clínicos
            </h2>

            {allPendingsAreZero ? (
              <p className="text-[14px] text-ink-cool-soft py-4">
                Sin pendientes clínicos por ahora
              </p>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-md bg-ink-cool-faint/30">
                  <span className="text-[14px] text-ink-cool-strong">
                    Notas sin firmar
                  </span>
                  <Badge status="warning">
                    {pendingCounts.unsignedNotes}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-ink-cool-faint/30">
                  <span className="text-[14px] text-ink-cool-strong">
                    Consentimientos pendientes
                  </span>
                  <Badge status="warning">
                    {pendingCounts.pendingConsent}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-ink-cool-faint/30">
                  <span className="text-[14px] text-ink-cool-strong">
                    Sin próxima cita
                  </span>
                  <Badge status="warning">
                    {pendingCounts.patientsNoNextAppointment}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-ink-cool-faint/30">
                  <span className="text-[14px] text-ink-cool-strong">
                    Datos por completar
                  </span>
                  <Badge status="pending">
                    {pendingCounts.incompleteData}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-ink-cool-faint/30">
                  <span className="text-[14px] text-ink-cool-strong">
                    Sesiones sin nota
                  </span>
                  <Badge status="cancel">
                    {pendingCounts.completedNoNote}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 3. RESUMEN SEMANAL — Weekly Summary */}
        <Card radius="lg" className="glass-cool">
          <div className="space-y-4">
            <h2 className="editorial-panel-title text-[1.05rem] font-serif text-ink-cool-strong">
              Resumen semanal
            </h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard
                label="Sesiones realizadas"
                value={String(weeklySummary.completedAppointments)}
              />
              <StatCard
                label="Notas firmadas"
                value={String(weeklySummary.signedNotes)}
              />
              <StatCard
                label="Notas pendientes"
                value={String(weeklySummary.pendingNotes)}
              />
              <StatCard
                label="Pacientes activos"
                value={String(weeklySummary.activePatients)}
              />
              <StatCard
                label="Sin próxima cita"
                value={String(weeklySummary.patientsWithoutNextAppointment)}
              />
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
