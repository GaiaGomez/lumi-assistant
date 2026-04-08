export const dynamic = 'force-dynamic'
// ============================================================
// PERFIL DE PACIENTE — historial de citas y notas clínicas
// [id] = parámetro dinámico de la URL: /pacientes/uuid-del-paciente
// ============================================================

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
  mapClinicalNoteRows,
  mapPatientRow,
} from '@/lib/supabase/mappers'
import PageBlobs from '@/components/ui/PageBlobs'
import EmptyState from '@/components/ui/EmptyState'
import PatientCaseNotesCard from '@/components/pacientes/PatientCaseNotesCard'
import PatientEditModal from '@/components/pacientes/PatientEditModal'
import PatientHeaderCard from '@/components/pacientes/PatientHeaderCard'
import PatientTopMosaic from '@/components/pacientes/PatientTopMosaic'
import AppointmentQuickStateEditor from '@/components/appointments/AppointmentQuickStateEditor'
import ClinicalNoteSummaryCard from '@/components/historias/ClinicalNoteSummaryCard'

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
      .select(APPOINTMENT_SELECT)
      .eq('patient_id', id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('clinical_notes')
      .select('id, patient_id, appointment_id, user_id, texto, canvas_url, canvas_paths, template_kind, template_data, created_at, updated_at')
      .eq('patient_id', id)
      .order('created_at', { ascending: false }),
  ])

  const settings = await settingsPromise

  if (!patient) notFound()

  const p = mapPatientRow(patient)
  const patientAppointments = mapAppointmentRows(appointments)
  const patientNotes = mapClinicalNoteRows(notes)

  const nextAppointment = getNextAppointment(patientAppointments)
  const lastPastAppointment = getLastPastAppointment(patientAppointments)
  const latestNote = patientNotes[0] ?? null
  const pendingPayments = getPendingPayments(patientAppointments)
  const pendingPaymentsCount = pendingPayments.length

  return (
    <div className="relative pb-1">
      <PageBlobs />

      <PatientHeaderCard
        patient={p}
        lastAppointmentDate={lastPastAppointment?.fecha_inicio ?? null}
        newNoteHref={`/historias/nueva?paciente=${id}`}
        editSlot={<PatientEditModal patient={p} />}
      />

      <PatientTopMosaic
        patient={p}
        appointments={patientAppointments}
        nextAppointment={nextAppointment}
        lastPastAppointment={lastPastAppointment}
        latestNote={latestNote}
        pendingPaymentsCount={pendingPaymentsCount}
        settings={settings}
      />

      <div className="space-y-2.5">
        {/* ── Historia clínica ── */}
        <section className="glass-cool relative rounded-[18px] p-3">
          <h2 className="editorial-panel-title mb-1.5 text-[1.05rem]">
            Historia clínica
          </h2>
          <div className="space-y-1.5">
            {patientNotes.length === 0 && <EmptyState message="No hay notas clínicas aún" />}
            {patientNotes.map((note) => (
              <ClinicalNoteSummaryCard key={note.id} note={note} />
            ))}
          </div>
        </section>

        {/* ── Historial de citas ── */}
        <section className="glass-cool relative rounded-[18px] p-3">
          <h2 className="editorial-panel-title mb-1.5 text-[1.05rem]">
            Historial de citas
          </h2>
          <div className="space-y-1.5">
            {patientAppointments.length === 0 && <EmptyState message="Sin citas registradas" />}
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
