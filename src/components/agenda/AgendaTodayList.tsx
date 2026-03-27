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

function sessionBadgeStyle(appointment: Appointment) {
  if (appointment.estado_sesion === 'asistio') {
    return { background: 'rgba(130,162,158,0.20)', color: '#2A5A55' }
  }
  if (appointment.estado_sesion === 'cancelo') {
    return { background: 'rgba(195,155,155,0.25)', color: '#7A2E2E' }
  }
  if (appointment.estado_sesion === 'no_asistio') {
    return { background: 'rgba(180,168,130,0.22)', color: '#6A4E18' }
  }
  return { background: 'rgba(158,152,165,0.20)', color: '#555555' }
}

function paymentBadgeStyle(appointment: Appointment) {
  return appointment.estado_pago === 'pagado'
    ? { background: 'rgba(130,162,158,0.20)', color: '#2A5A55' }
    : { background: 'rgba(185,172,135,0.22)', color: '#6A4E18' }
}

export default function AgendaTodayList({ appointments, variant }: AgendaTodayListProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-kicker">
          {variant === 'today' ? 'Hoy' : 'Próximas'}
        </h2>
        <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          {appointments.length} cita{appointments.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-2">
        {appointments.map((appointment) => (
          <Link
            key={appointment.id}
            href={`/pacientes/${appointment.patient_id}`}
            className="block glass rounded-[24px] p-4 transition-all hover:translate-y-[-1px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink-strong)' }}>
                  {appointment.patient
                    ? `${appointment.patient.nombre} ${appointment.patient.apellido}`
                    : appointment.notas || 'Cita'}
                </p>
                <p className="text-xs mt-1.5 tracking-[0.01em]" style={{ color: 'var(--ink-soft)' }}>
                  {variant === 'today'
                    ? `${formatTime(appointment.fecha_inicio)} · ${appointment.notas || 'Sesión agendada'}`
                    : `${formatDate(appointment.fecha_inicio)} · ${formatTime(appointment.fecha_inicio)}`}
                </p>
              </div>

              <div className="flex gap-1.5 flex-wrap justify-end">
                <span
                  className="status-badge"
                  style={sessionBadgeStyle(appointment)}
                >
                  {appointment.estado_sesion === 'asistio' ? 'Asistió' :
                   appointment.estado_sesion === 'cancelo' ? 'Canceló' :
                   appointment.estado_sesion === 'no_asistio' ? 'No asistió' : 'Pendiente'}
                </span>
                <span
                  className="status-badge"
                  style={paymentBadgeStyle(appointment)}
                >
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
