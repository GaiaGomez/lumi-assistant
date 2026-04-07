import Link from 'next/link'
import { ArrowLeft, Phone, Plus } from 'lucide-react'
import { Patient } from '@/types'
import PatientInactivityStatus from '@/components/pacientes/PatientInactivityStatus'
import Avatar from '@/components/ui/Avatar'

interface PatientHeaderCardProps {
  patient: Patient
  lastAppointmentDate: string | null
  newNoteHref: string
}

export default function PatientHeaderCard({
  patient,
  lastAppointmentDate,
  newNoteHref,
}: PatientHeaderCardProps) {
  return (
    <div className="relative mb-3 overflow-hidden rounded-[22px]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 14% 18%, rgba(255,255,255,0.24) 0%, transparent 20%), radial-gradient(circle at 88% 14%, rgba(217,209,218,0.34) 0%, transparent 24%)',
        }}
      />

      <div
        className="relative rounded-[22px]"
        style={{
          minHeight: '88px',
          padding: '14px 18px',
          background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
          border: '1px solid var(--border-glass-white)',
          boxShadow: 'var(--shadow-glass-soft)',
          backdropFilter: 'blur(24px) saturate(145%)',
          WebkitBackdropFilter: 'blur(24px) saturate(145%)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/pacientes"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                color: 'var(--ink-cool-soft)',
                background: 'rgba(255,255,255,0.42)',
                border: '1px solid var(--border-glass-white)',
                boxShadow: 'var(--shadow-glass)',
                backdropFilter: 'blur(18px) saturate(135%)',
                WebkitBackdropFilter: 'blur(18px) saturate(135%)',
              }}
            >
              <ArrowLeft size={15} />
            </Link>

            <Avatar nombre={patient.nombre} apellido={patient.apellido} size="md" />

            <div className="min-w-0 pt-2.5">
              <h1
                className="editorial-panel-title truncate leading-none"
                style={{ color: 'var(--ink-cool-strong)', fontSize: '25px' }}
              >
                {patient.nombre} {patient.apellido}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <PatientInactivityStatus
                  lastAppointmentDate={lastAppointmentDate}
                />
                {patient.telefono && (
                  <span
                    className="flex items-center gap-1 text-[12px]"
                    style={{ color: 'var(--ink-cool-soft)' }}
                  >
                    <Phone size={11} />
                    {patient.telefono}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href={newNoteHref}
            className="btn-action shrink-0 gap-1.5"
            style={{ height: '34px', padding: '0 14px', fontSize: '13px' }}
          >
            <Plus size={12} />
            Nueva nota
          </Link>
        </div>
      </div>
    </div>
  )
}
