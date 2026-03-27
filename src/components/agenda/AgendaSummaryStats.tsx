import { Appointment } from '@/types'

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

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="glass rounded-[26px] p-5">
      <p className="section-kicker mb-3">
        {label}
      </p>
      <p className="text-[1.05rem] font-medium leading-snug" style={{ color: 'var(--ink-strong)' }}>
        {value}
      </p>
      <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--ink-faint)' }}>
        {hint}
      </p>
    </div>
  )
}

export default function AgendaSummaryStats({
  todayCount,
  nextAppointment,
  pendingSessionCount,
  pendingPaymentCount,
}: AgendaSummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      <SummaryCard
        label="Hoy"
        value={todayCount === 0 ? 'Sin citas' : `${todayCount} cita${todayCount === 1 ? '' : 's'}`}
        hint={todayCount === 0 ? 'La agenda de hoy está libre.' : 'Sesiones programadas para hoy.'}
      />

      <SummaryCard
        label="Próxima cita"
        value={nextAppointment ? formatAppointmentDate(nextAppointment.fecha_inicio) : 'Sin próxima cita'}
        hint={nextAppointment
          ? (nextAppointment.patient
            ? `${nextAppointment.patient.nombre} ${nextAppointment.patient.apellido}`
            : 'Paciente sin nombre asociado')
          : 'No hay citas futuras agendadas.'}
      />

      <SummaryCard
        label="Pendientes"
        value={pendingSessionCount === 0 ? 'Todo al día' : `${pendingSessionCount} por atender`}
        hint={pendingSessionCount === 0
          ? 'No hay sesiones pendientes por revisar.'
          : 'Citas con estado de sesión pendiente.'}
      />

      <SummaryCard
        label="Pagos por revisar"
        value={pendingPaymentCount === 0 ? 'Ninguno' : `${pendingPaymentCount} pendiente${pendingPaymentCount === 1 ? '' : 's'}`}
        hint={pendingPaymentCount === 0
          ? 'No hay pagos por confirmar.'
          : 'Sesiones asistidas sin pago confirmado.'}
      />
    </div>
  )
}
