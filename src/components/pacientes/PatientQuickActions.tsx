import type { CSSProperties } from 'react'
import { MessageCircle, Wallet, BellRing } from 'lucide-react'
import { Appointment, Patient } from '@/types'
import { generarLinkWhatsApp, linkRecordatorioCita } from '@/lib/whatsapp'
import { interpolate, type SettingsMap } from '@/lib/settings'
import { formatDateTimeFull } from '@/lib/format'

interface PatientQuickActionsProps {
  patient: Patient
  nextAppointmentRequiringReminder: Appointment | null
  oldestPendingPayment: Appointment | null
  isInactive: boolean
  inactiveDays: number | null
  settings: SettingsMap
}

function buildDirectWhatsAppLink(whatsapp: string | null) {
  if (!whatsapp) return '#'
  return `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`
}

function ActionLink({
  href,
  label,
  hint,
  icon: Icon,
  accentStyle,
  variant = 'glass',
}: {
  href: string
  label: string
  hint: string
  icon: typeof MessageCircle
  accentStyle: CSSProperties
  variant?: 'glass' | 'dark'
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="flex items-start rounded-[16px] transition-opacity hover:opacity-90"
      style={{
        minHeight: '72px',
        padding: '12px 14px',
        gap: '9px',
        color: 'var(--ink-cool-strong)',
        background: variant === 'dark'
          ? 'linear-gradient(160deg, rgba(207,196,209,0.92) 0%, rgba(190,179,194,0.86) 100%)'
          : 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: `1px solid ${variant === 'dark' ? 'var(--border-glass-muted)' : 'var(--border-glass-white)'}`,
        boxShadow: variant === 'dark' ? 'var(--shadow-glass-soft)' : 'var(--shadow-glass)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
      >
      <span
        className="flex shrink-0 items-center justify-center rounded-[12px]"
        style={{
          width: '26px',
          height: '26px',
          background: variant === 'dark' ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.58)',
          ...accentStyle,
        }}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        {variant === 'dark' && (
          <span className="mb-0.5 block font-semibold uppercase" style={{ color: 'var(--ink-cool-faint)', fontSize: '8px', letterSpacing: '0.08em' }}>Sugerida</span>
        )}
        <span className="block font-medium leading-tight" style={{ fontSize: '13px' }}>{label}</span>
        <span
          className="mt-0.5 block truncate"
          style={{ color: variant === 'dark' ? 'var(--ink-cool)' : 'var(--ink-cool-faint)', fontSize: '11px' }}
        >
          {hint}
        </span>
      </span>
    </a>
  )
}

export default function PatientQuickActions({
  patient,
  nextAppointmentRequiringReminder,
  oldestPendingPayment,
  isInactive,
  inactiveDays,
  settings,
}: PatientQuickActionsProps) {
  const hasWhatsApp = !!patient.whatsapp
  const suggestedAction = oldestPendingPayment
    ? {
        label: 'Cobrar pago pendiente',
        hint: hasWhatsApp ? 'Cobro pendiente.' : 'Falta un número de WhatsApp.',
        icon: Wallet,
        accentStyle: { color: hasWhatsApp ? 'var(--ink-cool-faint)' : 'var(--ink-cool-muted)' },
        href: hasWhatsApp
          ? generarLinkWhatsApp(
              patient.whatsapp,
              interpolate(settings['template_cobros'], {
                first_name: patient.nombre,
                session_date: formatDateTimeFull(oldestPendingPayment.fecha_inicio),
              })
            )
          : undefined,
      }
    : nextAppointmentRequiringReminder
      ? {
          label: 'Recordar cita',
          hint: hasWhatsApp ? 'Próxima cita.' : 'Falta un número de WhatsApp.',
          icon: BellRing,
          accentStyle: { color: hasWhatsApp ? 'var(--ink-cool-faint)' : 'var(--ink-cool-muted)' },
          href: hasWhatsApp ? linkRecordatorioCita(patient, nextAppointmentRequiringReminder) : undefined,
        }
      : isInactive && inactiveDays
        ? {
            label: 'Contactar paciente inactivo',
            hint: hasWhatsApp ? `${inactiveDays} días sin sesión.` : 'Falta un número de WhatsApp.',
            icon: MessageCircle,
            accentStyle: { color: hasWhatsApp ? 'var(--ink-cool-faint)' : 'var(--ink-cool-muted)' },
            href: hasWhatsApp
              ? generarLinkWhatsApp(
                  patient.whatsapp,
                  interpolate(settings['template_retomar'], {
                    first_name: patient.nombre,
                    days_inactive: String(inactiveDays),
                  })
                )
              : undefined,
          }
        : null

  return (
    <div className="mb-3">
      <h2 className="mb-2 font-semibold uppercase" style={{ color: 'var(--ink-cool-muted)', fontSize: '9px', letterSpacing: '0.08em' }}>
        Acciones rápidas
      </h2>

      <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2">
        {suggestedAction ? (
          suggestedAction.href ? (
            <ActionLink
              href={suggestedAction.href}
              label={suggestedAction.label}
              hint={suggestedAction.hint}
              icon={suggestedAction.icon}
              accentStyle={suggestedAction.accentStyle}
              variant="dark"
            />
          ) : (
            <div
              className="flex items-start rounded-[16px]"
              style={{
                minHeight: '72px',
                padding: '12px 14px',
                gap: '9px',
                color: 'var(--ink-cool-strong)',
                background: 'linear-gradient(160deg, rgba(207,196,209,0.92) 0%, rgba(190,179,194,0.86) 100%)',
                border: '1px solid var(--border-glass-muted)',
                boxShadow: 'var(--shadow-glass-soft)',
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-[12px]"
                style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.24)', ...suggestedAction.accentStyle }}
              >
                <suggestedAction.icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="mb-0.5 block font-semibold uppercase" style={{ color: 'var(--ink-cool-faint)', fontSize: '8px', letterSpacing: '0.08em' }}>
                  Sugerida
                </span>
                <span className="block font-medium leading-tight" style={{ fontSize: '13px' }}>{suggestedAction.label}</span>
                <span className="mt-0.5 block truncate" style={{ color: 'var(--ink-cool)', fontSize: '11px' }}>{suggestedAction.hint}</span>
              </span>
            </div>
          )
        ) : (
          <div
            className="flex items-start rounded-[16px]"
            style={{
              minHeight: '72px',
              padding: '12px 14px',
              gap: '9px',
              color: 'var(--ink-cool-faint)',
              background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
              border: '1px solid var(--border-glass-white)',
              boxShadow: 'var(--shadow-glass)',
              backdropFilter: 'blur(22px) saturate(140%)',
              WebkitBackdropFilter: 'blur(22px) saturate(140%)',
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-[12px]"
              style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.58)', color: 'var(--ink-cool-muted)' }}
            >
              <BellRing size={16} />
            </span>
            <span className="min-w-0">
              <span className="block font-medium leading-tight" style={{ fontSize: '13px' }}>Seguimiento</span>
              <span className="mt-0.5 block truncate" style={{ fontSize: '11px' }}>Sin acciones pendientes.</span>
            </span>
          </div>
        )}

        {hasWhatsApp ? (
          <ActionLink
            href={buildDirectWhatsAppLink(patient.whatsapp)}
            label="WhatsApp"
            hint="Abre la conversación directa con el paciente."
            icon={MessageCircle}
            accentStyle={{ color: 'var(--ink-cool-faint)' }}
          />
        ) : (
          <div
            className="flex items-start rounded-[16px]"
            style={{
              minHeight: '72px',
              padding: '12px 14px',
              gap: '9px',
              color: 'var(--ink-cool-faint)',
              background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
              border: '1px solid var(--border-glass-white)',
              boxShadow: 'var(--shadow-glass)',
              backdropFilter: 'blur(22px) saturate(140%)',
              WebkitBackdropFilter: 'blur(22px) saturate(140%)',
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-[12px]"
              style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.58)', color: 'var(--ink-cool-muted)' }}
            >
              <MessageCircle size={16} />
            </span>
            <span className="min-w-0">
              <span className="block font-medium leading-tight" style={{ fontSize: '13px' }}>WhatsApp</span>
              <span className="mt-0.5 block truncate" style={{ fontSize: '11px' }}>Sin número.</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
