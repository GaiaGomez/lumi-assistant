import { Appointment } from '@/types'
import StatCard from '@/components/ui/StatCard'

interface AgendaSummaryStatsProps {
  todayCount: number
  nextAppointment: Appointment | null
  pendingSessionCount: number
  pendingPaymentCount: number
}

function formatAppointmentDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AgendaSummaryStats({
  todayCount,
  nextAppointment,
  pendingSessionCount,
  pendingPaymentCount,
}: AgendaSummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Hoy"
        value={todayCount === 0 ? 'Sin citas' : `${todayCount} cita${todayCount === 1 ? '' : 's'}`}
        hint={todayCount === 0 ? 'La agenda de hoy está libre.' : 'Sesiones programadas para hoy.'}
        muted={todayCount === 0}
      />

      <StatCard
        label="Próxima cita"
        value={nextAppointment ? formatAppointmentDate(nextAppointment.fecha_inicio) : 'Sin próxima cita'}
        hint={nextAppointment
          ? (nextAppointment.patient
            ? `${nextAppointment.patient.nombre} ${nextAppointment.patient.apellido}`
            : 'Paciente sin nombre asociado')
          : 'No hay citas futuras agendadas.'}
        muted={!nextAppointment}
      />

      <StatCard
        label="Pendientes"
        value={pendingSessionCount === 0 ? 'Todo al día' : `${pendingSessionCount} por atender`}
        hint={pendingSessionCount === 0
          ? 'No hay sesiones pendientes por revisar.'
          : 'Citas con estado de sesión pendiente.'}
        muted={pendingSessionCount === 0}
      />

      <StatCard
        label="Pagos por revisar"
        value={pendingPaymentCount === 0 ? 'Ninguno' : `${pendingPaymentCount} pendiente${pendingPaymentCount === 1 ? '' : 's'}`}
        hint={pendingPaymentCount === 0
          ? 'No hay pagos por confirmar.'
          : 'Sesiones asistidas sin pago confirmado.'}
        muted={pendingPaymentCount === 0}
      />
    </div>
  )
}
