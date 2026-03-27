export const dynamic = 'force-dynamic'
// ============================================================
// PERFIL DE PACIENTE — historial de citas y notas clínicas
// [id] = parámetro dinámico de la URL: /pacientes/uuid-del-paciente
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Appointment, ClinicalNote, Patient } from '@/types'
import { formatDateTimeFull, formatDateOnly } from '@/lib/format'
import { fetchSettings } from '@/lib/settings'
import {
  getNextAppointment,
  getLastPastAppointment,
  getPendingPayments,
  getOldestPendingPayment,
} from '@/lib/appointments'
import PageBlobs from '@/components/ui/PageBlobs'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import PatientCaseNotesCard from '@/components/pacientes/PatientCaseNotesCard'
import PatientHeaderCard from '@/components/pacientes/PatientHeaderCard'
import PatientTopMosaic from '@/components/pacientes/PatientTopMosaic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatientProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const settingsPromise = fetchSettings(supabase, user.id)

  const [{ data: patient }, { data: appointments }, { data: notes }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase
      .from('appointments')
      .select('id, patient_id, fecha_inicio, fecha_fin, estado_sesion, estado_pago')
      .eq('patient_id', id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('clinical_notes')
      .select('id, patient_id, texto, canvas_url, created_at')
      .eq('patient_id', id)
      .order('created_at', { ascending: false }),
  ])

  const settings = await settingsPromise

  if (!patient) notFound()

  const p = patient as Patient
  const patientAppointments = (appointments as Appointment[]) ?? []
  const patientNotes = (notes as ClinicalNote[]) ?? []

  const nextAppointment = getNextAppointment(patientAppointments)
  const lastPastAppointment = getLastPastAppointment(patientAppointments)
  const latestNote = patientNotes[0] ?? null
  const pendingPayments = getPendingPayments(patientAppointments)
  const pendingPaymentsCount = pendingPayments.length
  const oldestPendingPayment = getOldestPendingPayment(patientAppointments)

  return (
    <div className="relative mx-auto max-w-[1180px] px-4 pb-1 font-sans sm:px-5">
      <PageBlobs />

      <PatientHeaderCard
        patient={p}
        lastAppointmentDate={lastPastAppointment?.fecha_inicio ?? null}
        newNoteHref={`/historias/nueva?paciente=${id}`}
      />

      <PatientTopMosaic
        patient={p}
        nextAppointment={nextAppointment}
        lastPastAppointment={lastPastAppointment}
        latestNote={latestNote}
        pendingPaymentsCount={pendingPaymentsCount}
        oldestPendingPayment={oldestPendingPayment}
        settings={settings}
      />

      <div className="space-y-2.5">
        {/* ── Historia clínica ── */}
        <section className="glass-cool relative rounded-[18px] p-3">
          <h2 className="editorial-panel-title text-[1.12rem] sm:text-[1.2rem] mb-2" style={{ color: 'var(--ink-cool-strong)' }}>
            Historia clínica
          </h2>
          <div className="space-y-2">
            {patientNotes.length === 0 && <EmptyState message="No hay notas clínicas aún" />}
            {patientNotes.map((note) => (
              <Link
                key={note.id}
                href={`/historias/${note.id}`}
                className="block rounded-[14px] p-[10px] transition-all hover:translate-y-[-1px]"
                style={{
                  minHeight: '52px',
                  background: 'rgba(255,255,255,0.30)',
                  border: '1px solid var(--border-glass-white)',
                  boxShadow: '0 8px 28px rgba(124, 108, 128, 0.08)',
                }}
              >
                <p className="mb-0.5 text-[11px] capitalize tracking-[0.03em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  {formatDateOnly(note.created_at)}
                </p>
                <p className="line-clamp-2 text-[12px] leading-5" style={{ color: 'var(--ink-cool)' }}>
                  {note.canvas_url ? 'Nota manuscrita' : 'Nota de sesión'}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Historial de citas ── */}
        <section className="glass-cool relative rounded-[18px] p-3">
          <h2 className="editorial-panel-title text-[1.12rem] sm:text-[1.2rem] mb-2" style={{ color: 'var(--ink-cool-strong)' }}>
            Historial de citas
          </h2>
          <div className="space-y-2">
            {patientAppointments.length === 0 && <EmptyState message="Sin citas registradas" />}
            {patientAppointments.map((apt) => (
              <div
                key={apt.id}
                className="rounded-[14px] p-[10px]"
                style={{
                  minHeight: '52px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.32) 100%)',
                  border: '1px solid var(--border-glass-white)',
                  boxShadow: '0 10px 24px rgba(124, 108, 128, 0.07)',
                }}
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] leading-5" style={{ color: 'var(--ink-cool)' }}>
                    {formatDateTimeFull(apt.fecha_inicio)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge status={
                      apt.estado_sesion === 'asistio'    ? 'success'  :
                      apt.estado_sesion === 'cancelo'    ? 'cancel'   :
                      apt.estado_sesion === 'no_asistio' ? 'warning'  : 'inactive'
                    }>
                      {apt.estado_sesion === 'asistio'    ? 'Asistió'    :
                       apt.estado_sesion === 'cancelo'    ? 'Canceló'    :
                       apt.estado_sesion === 'no_asistio' ? 'No asistió' : 'Programada'}
                    </Badge>
                    <Badge status={apt.estado_pago === 'pagado' ? 'success' : 'pending'}>
                      {apt.estado_pago === 'pagado' ? 'Pagada' : 'Pendiente de pago'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-3">
        <PatientCaseNotesCard generalNotes={p.notas_generales} />
      </div>
    </div>
  )
}
