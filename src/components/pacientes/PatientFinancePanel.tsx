import { Appointment } from '@/types'

interface SessionCounts {
  total: number
  asistio: number
  cancelo: number
  noAsistio: number
  pendientes: number
}

interface PatientFinancePanelProps {
  sessionCounts: SessionCounts
  pendingPaymentAppointments: Appointment[]
}

function formatAppointmentDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.48)' }}>
      <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#AAAAAA' }}>
        {label}
      </p>
      <p className="text-lg font-medium mt-1" style={{ color: '#111111' }}>
        {value}
      </p>
    </div>
  )
}

export default function PatientFinancePanel({
  sessionCounts,
  pendingPaymentAppointments,
}: PatientFinancePanelProps) {
  return (
    <div className="glass rounded-2xl p-4">
      <h2 className="font-medium text-sm tracking-widest uppercase mb-4" style={{ color: '#888888' }}>
        Sesiones y pagos
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatChip label="Total" value={sessionCounts.total} />
        <StatChip label="Asistió" value={sessionCounts.asistio} />
        <StatChip label="Canceló" value={sessionCounts.cancelo} />
        <StatChip label="No asistió" value={sessionCounts.noAsistio} />
      </div>

      <div className="rounded-2xl p-3 mb-4" style={{ background: 'rgba(185,172,135,0.14)' }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: '#7A6020' }}>
          Pagos pendientes
        </p>
        <p className="text-lg font-medium" style={{ color: '#6A4E18' }}>
          {sessionCounts.pendientes}
        </p>
      </div>

      <div className="space-y-2">
        {pendingPaymentAppointments.length === 0 ? (
          <p className="text-sm" style={{ color: '#AAAAAA' }}>
            No hay pagos pendientes.
          </p>
        ) : (
          pendingPaymentAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-2xl p-3"
              style={{ background: 'rgba(255,255,255,0.48)' }}
            >
              <p className="text-sm font-medium" style={{ color: '#111111' }}>
                {formatAppointmentDate(appointment.fecha_inicio)}
              </p>
              <p className="text-xs mt-1" style={{ color: '#888888' }}>
                {appointment.notas || 'Sesión asistida pendiente por confirmar pago.'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
