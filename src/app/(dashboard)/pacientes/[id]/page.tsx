export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { formatDateTimeFull } from '@/lib/format'
import { fetchSettings } from '@/lib/settings'
import {
  getNextAppointment,
  getLastPastAppointment,
  getPendingPayments,
} from '@/lib/appointments'
import {
  APPOINTMENT_SELECT,
  mapAppointmentRows,
  mapPatientRow,
} from '@/lib/supabase/mappers'
import { getPatientNotes } from '@/lib/notes/actions'
import PageBlobs from '@/components/ui/PageBlobs'
import EmptyState from '@/components/ui/EmptyState'
import PatientCaseNotesCard from '@/components/pacientes/PatientCaseNotesCard'
import PatientEditModal from '@/components/pacientes/PatientEditModal'
import PatientHeaderCard from '@/components/pacientes/PatientHeaderCard'
import PatientTopMosaic from '@/components/pacientes/PatientTopMosaic'
import AppointmentQuickStateEditor from '@/components/appointments/AppointmentQuickStateEditor'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatientProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const settingsPromise = fetchSettings(supabase, user.id)

  const [{ data: patient }, { data: appointments }, notes] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('patient_id', id)
      .order('fecha_inicio', { ascending: false }),
    getPatientNotes(id),
  ])

  const settings = await settingsPromise

  if (!patient) notFound()

  const p = mapPatientRow(patient)
  const patientAppointments = mapAppointmentRows(appointments)

  const nextAppointment = getNextAppointment(patientAppointments)
  const lastPastAppointment = getLastPastAppointment(patientAppointments)
  const latestNoteId = notes[0]?.id ?? null
  const pendingPayments = getPendingPayments(patientAppointments)
  const pendingPaymentsCount = pendingPayments.length

  return (
    <div className="relative pb-1">
      <PageBlobs />

      <PatientHeaderCard
        patient={p}
        lastAppointmentDate={lastPastAppointment?.fecha_inicio ?? null}
        editSlot={<PatientEditModal patient={p} />}
      />

      <PatientTopMosaic
        patient={p}
        appointments={patientAppointments}
        nextAppointment={nextAppointment}
        lastPastAppointment={lastPastAppointment}
        latestNoteId={latestNoteId}
        pendingPaymentsCount={pendingPaymentsCount}
        settings={settings}
      />

      <div className="space-y-2.5">
        {/* ── Historia clínica ── */}
        <section className="glass-cool relative rounded-[18px] p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h2 className="editorial-panel-title text-[1.05rem]">Historia clínica</h2>
            <Link
              href={`/notas/nueva?paciente=${id}`}
              className="btn-action gap-1.5 px-3 py-1.5 text-[13px]"
            >
              + Nueva nota
            </Link>
          </div>
          <div className="space-y-1.5">
            {notes.length === 0 && <EmptyState message="No hay notas clínicas aún" />}
            {notes.map((note) => {
              const preview = note.quickNote ?? note.comoLlego ?? '—'
              const previewText = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview
              const fecha = new Date(note.createdAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
              return (
                <Link
                  key={note.id}
                  href={`/notas/${note.id}`}
                  className="block rounded-[14px] px-3 py-2 transition-opacity hover:opacity-80"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.32) 100%)',
                    border: '1px solid var(--border-glass-white)',
                    boxShadow: '0 10px 24px rgba(124, 108, 128, 0.07)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="section-kicker">
                      Sesión #{note.sessionNumber ?? '—'}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--ink-cool-faint)' }}
                    >
                      {fecha}
                    </span>
                  </div>
                  <p
                    className="mt-0.5 text-[13px] leading-snug"
                    style={{ color: 'var(--ink-cool-soft)' }}
                  >
                    {previewText}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Historial de citas ── */}
        <section className="glass-cool relative rounded-[18px] p-3">
          <h2 className="editorial-panel-title mb-1.5 text-[1.05rem]">
            Historial
          </h2>
          <div className="space-y-1.5">
            {patientAppointments.length === 0 && <EmptyState message="Sin citas" />}
            {patientAppointments.map((apt) => (
              <div
                key={apt.id}
                className="rounded-[14px] px-3 py-2"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.32) 100%)',
                  border: '1px solid var(--border-glass-white)',
                  boxShadow: '0 10px 24px rgba(124, 108, 128, 0.07)',
                }}
              >
                <p className="text-[13px] leading-5" style={{ color: 'var(--ink-cool)' }}>
                  {formatDateTimeFull(apt.fecha_inicio)}
                </p>
                <div
                  className="mt-1 rounded-[12px] px-2 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.34)',
                    border: '1px solid var(--border-glass-white)',
                  }}
                >
                  <AppointmentQuickStateEditor
                    appointmentId={apt.id}
                    initialSessionState={apt.estado_sesion}
                    initialPaymentState={apt.estado_pago}
                    compact
                  />
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
