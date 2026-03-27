import Link from 'next/link'
import { Appointment } from '@/types'

interface AgendaTodayListProps {
  appointments: Appointment[]
  variant: 'today' | 'upcoming'
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function sessionBadgeClass(appointment: Appointment) {
  if (appointment.estado_sesion === 'asistio')    return 'status-badge status-badge--success'
  if (appointment.estado_sesion === 'cancelo')    return 'status-badge status-badge--cancel'
  if (appointment.estado_sesion === 'no_asistio') return 'status-badge status-badge--warning'
  return 'status-badge status-badge--inactive'
}

function paymentBadgeClass(appointment: Appointment) {
  return appointment.estado_pago === 'pagado'
    ? 'status-badge status-badge--success'
    : 'status-badge status-badge--pending'
}

export default function AgendaTodayList({ appointments, variant }: AgendaTodayListProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="card-label" style={{ color: 'var(--ink-cool-faint)' }}>
          {variant === 'today' ? 'Hoy' : 'Próximas'}
        </h2>
        <p className="text-[11px]" style={{ color: 'var(--ink-cool-muted)' }}>
          {appointments.length} cita{appointments.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-2">
        {appointments.map((appointment) => (
          <Link
            key={appointment.id}
            href={`/pacientes/${appointment.patient_id}`}
            className="block glass-cool rounded-[16px] p-4 transition-all hover:translate-y-[-1px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                  {appointment.patient
                    ? `${appointment.patient.nombre} ${appointment.patient.apellido}`
                    : appointment.notas || 'Cita'}
                </p>
                <p className="text-xs mt-1.5 tracking-[0.01em]" style={{ color: 'var(--ink-cool-soft)' }}>
                  {variant === 'today'
                    ? `${formatTime(appointment.fecha_inicio)} · ${appointment.notas || 'Sesión agendada'}`
                    : `${formatDate(appointment.fecha_inicio)} · ${formatTime(appointment.fecha_inicio)}`}
                </p>
              </div>

              <div className="flex gap-1.5 flex-wrap justify-end">
                <span className={sessionBadgeClass(appointment)}>
                  {appointment.estado_sesion === 'asistio' ? 'Asistió' :
                   appointment.estado_sesion === 'cancelo' ? 'Canceló' :
                   appointment.estado_sesion === 'no_asistio' ? 'No asistió' : 'Pendiente'}
                </span>
                <span className={paymentBadgeClass(appointment)}>
                  {appointment.estado_pago === 'pagado' ? 'Pagado' : 'Pago pendiente'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
