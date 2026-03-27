import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { Patient } from '@/types'
import PatientInactivityStatus from '@/components/pacientes/PatientInactivityStatus'

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
  const palette = {
    glass: 'rgba(255,255,255,0.38)',
    glassStrong: 'rgba(255,255,255,0.52)',
    lilacSoft: '#D9D1DA',
    lilacMuted: '#CFC4D1',
    mauveFog: '#C7BCC8',
    lavenderSmoke: '#BEB3C2',
    inkStrong: '#3F3941',
    ink: '#5A535D',
    inkSoft: '#635965',
    inkFaint: '#7E7381',
    borderGlass: 'rgba(255,255,255,0.42)',
    borderSoft: 'rgba(185,174,189,0.28)',
    shadowGlass: '0 10px 40px rgba(124, 108, 128, 0.10)',
    shadowSoft: '0 18px 50px rgba(140, 122, 145, 0.10)',
  }

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
          background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
          border: `1px solid ${palette.borderGlass}`,
          boxShadow: palette.shadowSoft,
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
                color: palette.inkSoft,
                background: 'rgba(255,255,255,0.42)',
                border: `1px solid ${palette.borderGlass}`,
                boxShadow: palette.shadowGlass,
                backdropFilter: 'blur(18px) saturate(135%)',
                WebkitBackdropFilter: 'blur(18px) saturate(135%)',
              }}
            >
              <ArrowLeft size={15} />
            </Link>

            <div
              className="rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                width: '36px',
                height: '36px',
                background: `linear-gradient(145deg, ${palette.lilacSoft} 0%, ${palette.lavenderSmoke} 100%)`,
                boxShadow: palette.shadowGlass,
                border: `1px solid ${palette.borderGlass}`,
              }}
            >
              <span className="text-[10px] font-medium tracking-[0.02em]" style={{ color: palette.inkStrong }}>
                {patient.nombre[0]}{patient.apellido[0]}
              </span>
            </div>

            <div className="min-w-0 pt-2.5">
              <h1
                className="editorial-panel-title truncate leading-none"
                style={{ color: palette.inkStrong, fontSize: '25px' }}
              >
                {patient.nombre} {patient.apellido}
              </h1>
              <div className="mt-1.5" style={{ color: palette.inkStrong }}>
                <PatientInactivityStatus
                  lastAppointmentDate={lastAppointmentDate}
                />
              </div>
            </div>
          </div>

          <Link
            href={newNoteHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium"
            style={{
              height: '34px',
              padding: '0 14px',
              fontSize: '13px',
              background: `linear-gradient(145deg, ${palette.lavenderSmoke} 0%, ${palette.mauveFog} 100%)`,
              color: palette.inkStrong,
              border: `1px solid rgba(255,255,255,0.32)`,
              boxShadow: palette.shadowGlass,
            }}
          >
            <Plus size={12} />
            Nueva nota
          </Link>
        </div>
      </div>
    </div>
  )
}
