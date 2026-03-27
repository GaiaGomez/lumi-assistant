import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Appointment, ClinicalNote, Patient } from '@/types'
import { generarLinkWhatsApp } from '@/lib/whatsapp'
import { interpolate, type SettingsMap } from '@/lib/settings'
import { formatDateTimeFull } from '@/lib/format'

const palette = {
  glass: 'rgba(255,255,255,0.38)',
  glassStrong: 'rgba(255,255,255,0.52)',
  lilacMuted: '#CFC4D1',
  mauveFog: '#C7BCC8',
  lavenderSmoke: '#BEB3C2',
  inkStrong: '#3F3941',
  inkFaint: '#7E7381',
  inkSoft: '#635965',
  borderGlass: 'rgba(255,255,255,0.42)',
  borderSoft: 'rgba(185,174,189,0.28)',
  shadowGlass: '0 10px 40px rgba(124, 108, 128, 0.10)',
  shadowSoft: '0 18px 50px rgba(140, 122, 145, 0.10)',
}

interface PatientTopMosaicProps {
  patient: Patient
  nextAppointment: Appointment | null
  lastPastAppointment: Appointment | null
  latestNote: ClinicalNote | null
  pendingPaymentsCount: number
  oldestPendingPayment: Appointment | null
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

function SummaryCard({
  label,
  value,
  hint,
  href,
}: {
  label: string
  value: string
  hint?: string
  href?: string
}) {
  const content = (
    <div
      className="h-full rounded-[16px] font-sans"
      style={{
        minHeight: '84px',
        padding: '12px 14px',
        background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
        border: `1px solid ${palette.borderGlass}`,
        boxShadow: palette.shadowGlass,
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <p className="mb-1 font-semibold uppercase" style={{ color: palette.inkFaint, fontSize: '8px', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="font-medium leading-snug" style={{ color: palette.inkStrong, fontSize: '15px' }}>
        {value}
      </p>
      {hint ? (
          <p className="mt-1 text-[12px] leading-none" style={{ color: palette.inkSoft }}>
            {hint}
          </p>
        ) : null}
    </div>
  )

  if (!href) return content
  return <Link href={href} className="block h-full">{content}</Link>
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
          ? `linear-gradient(160deg, rgba(207,196,209,0.92) 0%, rgba(190,179,194,0.86) 100%)`
          : `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
        border: `1px solid ${accent === 'soft' ? palette.borderSoft : palette.borderGlass}`,
        boxShadow: accent === 'soft' ? palette.shadowSoft : palette.shadowGlass,
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{
            background: accent === 'soft' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.56)',
            color: palette.inkSoft,
          }}
        >
          <MessageCircle size={13} />
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-snug" style={{ color: palette.inkStrong, fontSize: '15px' }}>
            {label}
          </p>
          <p className="mt-1 text-[10px] leading-tight" style={{ color: palette.inkSoft }}>
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
  nextAppointment,
  lastPastAppointment,
  latestNote,
  pendingPaymentsCount,
  oldestPendingPayment,
  settings,
}: PatientTopMosaicProps) {
  const hasWhatsApp = !!patient.whatsapp
  const whatsappHref = hasWhatsApp ? `https://wa.me/${patient.whatsapp?.replace(/[^0-9]/g, '')}` : undefined

  const paymentHref = hasWhatsApp && oldestPendingPayment
    ? generarLinkWhatsApp(
        patient.whatsapp,
        interpolate(settings['template_cobros'], {
          first_name: patient.nombre,
          session_date: formatDateTimeFull(oldestPendingPayment.fecha_inicio),
        })
      )
    : undefined

  const agendaHref = hasWhatsApp
    ? generarLinkWhatsApp(
        patient.whatsapp,
        interpolate(settings['template_sin_proxima'], {
          first_name: patient.nombre,
          booking_url: settings['doctoralia_url'],
        })
      )
    : undefined
  const noWhatsAppText = 'No tiene numero de WhatsApp registrado'
  const nextAppointmentText = nextAppointment ? formatAppointmentDate(nextAppointment.fecha_inicio) : null
  const lastPastAppointmentText = lastPastAppointment ? formatAppointmentDate(lastPastAppointment.fecha_inicio) : null

  return (
    <div className="mb-3 space-y-[10px]">
      <div className="grid gap-[10px] md:grid-cols-4">
        <SummaryCard
          label="PRÓXIMA CITA"
          value={nextAppointmentText ? nextAppointmentText.primary : 'Sin cita'}
          hint={nextAppointmentText ? nextAppointmentText.secondary : undefined}
        />
        <SummaryCard
          label="ÚLTIMA SESIÓN"
          value={lastPastAppointmentText ? lastPastAppointmentText.primary : 'Sin sesiones'}
          hint={lastPastAppointmentText ? lastPastAppointmentText.secondary : undefined}
        />
        <SummaryCard
          label="PAGOS PENDIENTES"
          value={pendingPaymentsCount === 0 ? 'Todo al día' : `${pendingPaymentsCount} pendiente${pendingPaymentsCount === 1 ? '' : 's'}`}
          hint={pendingPaymentsCount === 0 ? undefined : 'Sin pago confirmado'}
        />
        <SummaryCard
          label="HISTORIA CLÍNICA"
          value="Última nota"
          hint={latestNote ? '25 mar 2026' : undefined}
          href={latestNote ? `/historias/${latestNote.id}` : undefined}
        />
      </div>

      <div className="grid gap-[10px] md:grid-cols-3">
        <ActionCard
          label="Cobrar pago pendiente"
          hint={hasWhatsApp ? 'Cobro pendiente' : noWhatsAppText}
          href={paymentHref}
          accent="soft"
        />
        <ActionCard
          label="Agendar sesión"
          hint="Sin próxima sesion agendada."
          href={agendaHref}
        />
        <ActionCard
          label="WhatsApp"
          hint={hasWhatsApp ? 'Abrir chat' : noWhatsAppText}
          href={whatsappHref}
        />
      </div>
    </div>
  )
}
