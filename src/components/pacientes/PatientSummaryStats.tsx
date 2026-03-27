import Link from 'next/link'
import { Appointment, ClinicalNote } from '@/types'

const palette = {
  glass: 'rgba(255,255,255,0.38)',
  glassStrong: 'rgba(255,255,255,0.52)',
  inkStrong: '#3F3941',
  inkFaint: '#B2AAB3',
  borderGlass: 'rgba(255,255,255,0.42)',
  shadowGlass: '0 10px 40px rgba(124, 108, 128, 0.10)',
}

interface PatientSummaryStatsProps {
  nextAppointment: Appointment | null
  lastPastAppointment: Appointment | null
  latestNote: ClinicalNote | null
  pendingPaymentsCount: number
}

function formatAppointmentDate(date: string) {
  const parsedDate = new Date(date)
  const month = parsedDate.toLocaleDateString('en-US', { month: 'short' })
  const day = parsedDate.toLocaleDateString('en-US', { day: 'numeric' })
  const year = parsedDate.toLocaleDateString('en-US', { year: 'numeric' })
  const time = parsedDate.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${month} ${day}, ${year} · ${time}`
}

function getLatestNoteLabel(note: ClinicalNote | null) {
  if (!note) return 'Sin notas'
  if (note.canvas_url) return 'Nota manuscrita'
  if (!note.texto) return 'Nota clínica'

  return note.texto.length > 30
    ? `${note.texto.slice(0, 30)}...`
    : note.texto
}

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div
      className="h-full rounded-[16px]"
      style={{
        minHeight: '96px',
        padding: '12px 14px',
        background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
        border: `1px solid ${palette.borderGlass}`,
        boxShadow: palette.shadowGlass,
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <p className="mb-1 font-semibold uppercase" style={{ color: palette.inkFaint, fontSize: '9px', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="max-w-[18ch] font-medium leading-snug" style={{ color: palette.inkStrong, fontSize: '14px' }}>
        {value}
      </p>
    </div>
  )

  if (!href) return content

  return <Link href={href} className="block h-full">{content}</Link>
}

export default function PatientSummaryStats({
  nextAppointment,
  lastPastAppointment,
  latestNote,
  pendingPaymentsCount,
}: PatientSummaryStatsProps) {
  return (
    <div className="mb-3 grid max-w-[760px] grid-cols-2 gap-2.5">
      <SummaryCard
        label="Próxima cita"
        value={nextAppointment ? formatAppointmentDate(nextAppointment.fecha_inicio) : 'Sin cita'}
      />

      <SummaryCard
        label="Última sesión"
        value={lastPastAppointment ? formatAppointmentDate(lastPastAppointment.fecha_inicio) : 'Sin sesiones'}
      />

      <SummaryCard
        label="Pagos pendientes"
        value={pendingPaymentsCount === 0 ? 'Todo al día' : `${pendingPaymentsCount} pendiente${pendingPaymentsCount === 1 ? '' : 's'}`}
      />

      <SummaryCard
        label="Última nota"
        value={getLatestNoteLabel(latestNote)}
        href={latestNote ? `/historias/${latestNote.id}` : undefined}
      />
    </div>
  )
}
