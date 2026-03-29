import { Appointment } from '@/types'

interface SessionCounts {
  total: number
  realizadas: number
  cancelo: number
  confirmadas: number
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
    <div
      className="rounded-[14px] p-3"
      style={{
        background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: '1px solid var(--border-glass-white)',
        boxShadow: 'var(--shadow-glass)',
      }}
    >
      <p className="card-label mb-1" style={{ color: 'var(--ink-cool-muted)' }}>
        {label}
      </p>
      <p className="text-[18px] font-medium leading-none" style={{ color: 'var(--ink-cool-strong)' }}>
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
    <div
      className="rounded-[18px] p-4"
      style={{
        background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: '1px solid var(--border-glass-white)',
        boxShadow: 'var(--shadow-glass)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <h2 className="section-kicker mb-4">Sesiones y pagos</h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatChip label="Total" value={sessionCounts.total} />
        <StatChip label="Realizadas" value={sessionCounts.realizadas} />
        <StatChip label="Canceló" value={sessionCounts.cancelo} />
        <StatChip label="Confirmadas" value={sessionCounts.confirmadas} />
      </div>

      <div
        className="rounded-[14px] p-3 mb-4"
        style={{
          background: 'var(--state-pending-bg)',
          border: '1px solid var(--border-glass-white)',
        }}
      >
        <p className="card-label mb-1" style={{ color: 'var(--state-pending-text)' }}>
          Pagos pendientes
        </p>
        <p className="text-[18px] font-medium leading-none" style={{ color: 'var(--state-pending-text)' }}>
          {sessionCounts.pendientes}
        </p>
      </div>

      <div className="space-y-2">
        {pendingPaymentAppointments.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
            No hay pagos pendientes.
          </p>
        ) : (
          pendingPaymentAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-[14px] p-3"
              style={{
                background: 'rgba(255,255,255,0.48)',
                border: '1px solid var(--border-glass-white)',
              }}
            >
              <p className="text-[13px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                {formatAppointmentDate(appointment.fecha_inicio)}
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--ink-cool-faint)' }}>
                {appointment.notas || 'Sesión realizada pendiente por confirmar pago.'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
