export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { APPOINTMENT_SELECT, mapAppointmentRow } from '@/lib/supabase/mappers'
import SessionNote from '@/components/notes/SessionNote'
import PageBlobs from '@/components/ui/PageBlobs'
import { formatDateTimeFull } from '@/lib/format'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CitaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: apt } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!apt) notFound()

  const appointment = mapAppointmentRow(apt)

  if (!appointment.patient_id || !appointment.patient) notFound()

  const patientName = `${appointment.patient.nombre} ${appointment.patient.apellido}`

  return (
    <div className="relative pb-6">
      <PageBlobs />

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/pacientes/${appointment.patient_id}`}
          className="btn-subtle flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <p className="section-kicker mb-0.5">Nota de sesión</p>
          <h1 className="page-title text-[1.6rem] leading-none">{patientName}</h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
            {formatDateTimeFull(appointment.fecha_inicio)}
          </p>
        </div>
      </div>

      <div className="glass-cool rounded-[18px] overflow-hidden">
        <SessionNote
          appointmentId={id}
          patientId={appointment.patient_id}
          patientName={patientName}
        />
      </div>
    </div>
  )
}
