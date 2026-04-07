import { MessageCircle } from 'lucide-react'
import { Appointment, ClinicalNote, Patient } from '@/types'
import { type SettingsMap } from '@/lib/settings'
import { buildPatientWhatsAppQuickActions } from '@/lib/pending-actions'
import StatCard from '@/components/ui/StatCard'

interface PatientTopMosaicProps {
  patient: Patient
  appointments: Appointment[]
  nextAppointment: Appointment | null
  lastPastAppointment: Appointment | null
  latestNote: ClinicalNote | null
  pendingPaymentsCount: number
  settings: SettingsMap
}

function formatAppointmentDate(date: string) {
  const parsedDate = new Date(date)
  const weekdayRaw = parsedDate.toLocaleDateString('es-CO', { weekday: 'long' })
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)
  const day = String(parsedDate.getDate()).padStart(2, '0')
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const year = String(parsedDate.getFullYear()).slice(-2)
  const time = parsedDate.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return {
    primary: `${weekday} · ${time}`,
    secondary: `${day}/${month}/${year}`,
  }
}

function ActionCard({
  label,
  hint,
  href,
  accent = 'glass',
}: {
  label: string
  hint: string
  href?: string
  accent?: 'glass' | 'soft'
}) {
  const content = (
    <div
      className="h-full rounded-[16px] font-sans"
      style={{
        minHeight: '72px',
        padding: '12px 14px',
        background: accent === 'soft'
          ? 'linear-gradient(160deg, rgba(207,196,209,0.92) 0%, rgba(190,179,194,0.86) 100%)'
          : 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: `1px solid ${accent === 'soft' ? 'var(--border-glass-muted)' : 'var(--border-glass-white)'}`,
        boxShadow: accent === 'soft' ? 'var(--shadow-glass-soft)' : 'var(--shadow-glass)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{
            background: accent === 'soft' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.56)',
            color: 'var(--ink-cool-soft)',
          }}
        >
          <MessageCircle size={13} />
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-snug" style={{ color: 'var(--ink-cool-strong)', fontSize: '15px' }}>
            {label}
          </p>
          <p className="mt-1 text-[10px] leading-tight" style={{ color: 'var(--ink-cool-soft)' }}>
            {hint}
          </p>
        </div>
      </div>
    </div>
  )

  if (!href) return content
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
      {content}
    </a>
  )
}

export default function PatientTopMosaic({
  patient,
  appointments,
  nextAppointment,
  lastPastAppointment,
  latestNote,
  pendingPaymentsCount,
  settings,
}: PatientTopMosaicProps) {
  // Derivamos el número de WhatsApp: campo whatsapp tiene prioridad,
  // pero si está vacío usamos telefono (solo dígitos) como fallback.
  const effectiveWhatsapp =
    patient.whatsapp ??
    (patient.telefono ? patient.telefono.replace(/[^0-9]/g, '') : null)

  const effectivePatient = effectiveWhatsapp !== patient.whatsapp
    ? { ...patient, whatsapp: effectiveWhatsapp }
    : patient

  const hasWhatsApp = !!effectiveWhatsapp
  const whatsappHref = hasWhatsApp ? `https://wa.me/${effectiveWhatsapp}` : undefined

  const nextAppointmentText = nextAppointment ? formatAppointmentDate(nextAppointment.fecha_inicio) : null
  const lastPastAppointmentText = lastPastAppointment ? formatAppointmentDate(lastPastAppointment.fecha_inicio) : null
  const quickActions = buildPatientWhatsAppQuickActions(effectivePatient, appointments, settings)

  const actionCards = [
    ...quickActions,
    hasWhatsApp ? {
      key: 'whatsapp',
      label: 'WhatsApp',
      hint: 'Abrir chat',
      href: whatsappHref,
      accent: 'glass' as const,
    } : null,
  ].filter(Boolean) as Array<{
    key: string
    label: string
    hint: string
      href: string
      accent: 'glass' | 'soft'
  }>

  return (
    <div className="mb-3 space-y-[10px]">
      <div className="grid gap-[10px] md:grid-cols-4">
        <StatCard
          label="Próxima cita"
          value={nextAppointmentText ? nextAppointmentText.primary : 'Sin cita'}
          hint={nextAppointmentText ? nextAppointmentText.secondary : undefined}
          muted={!nextAppointmentText}
        />
        <StatCard
          label="Última sesión"
          value={lastPastAppointmentText ? lastPastAppointmentText.primary : 'Sin sesiones'}
          hint={lastPastAppointmentText ? lastPastAppointmentText.secondary : undefined}
          muted={!lastPastAppointmentText}
        />
        <StatCard
          label="Pagos pendientes"
          value={pendingPaymentsCount === 0 ? 'Todo al día' : `${pendingPaymentsCount} pendiente${pendingPaymentsCount === 1 ? '' : 's'}`}
          hint={pendingPaymentsCount === 0 ? undefined : 'Sin pago confirmado'}
          muted={pendingPaymentsCount === 0}
        />
        <StatCard
          label="Historia clínica"
          value={latestNote ? 'Última nota' : 'Sin notas'}
          href={latestNote ? `/historias/${latestNote.id}` : undefined}
          muted={!latestNote}
        />
      </div>

      {actionCards.length > 0 && (
        <div className={`grid gap-[10px] ${actionCards.length === 1 ? 'md:grid-cols-1' : actionCards.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {actionCards.map((action) => (
            <ActionCard
              key={action.key}
              label={action.label}
              hint={action.hint}
              href={action.href}
              accent={action.accent}
            />
          ))}
        </div>
      )}
    </div>
  )
}
