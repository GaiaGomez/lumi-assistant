export const dynamic = 'force-dynamic'
// ============================================================
// PERFIL DE PACIENTE — historial de citas y notas clínicas
// [id] = parámetro dinámico de la URL: /pacientes/uuid-del-paciente
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Appointment, ClinicalNote, Patient } from '@/types'
import { formatDateTimeFull, formatDateOnly } from '@/lib/format'
import { fetchSettings } from '@/lib/settings'
import PageBlobs from '@/components/ui/PageBlobs'
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

  // fetchSettings corre en paralelo con las otras queries
  const settingsPromise = fetchSettings(supabase, user!.id)

  // Cargamos el paciente, sus citas y sus notas clínicas en paralelo
  // Promise.all ejecuta las 3 queries al mismo tiempo (más rápido que secuencial)
  const [{ data: patient }, { data: appointments }, { data: notes }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('appointments').select('*').eq('patient_id', id).order('fecha_inicio', { ascending: false }),
    supabase.from('clinical_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
  ])

  const settings = await settingsPromise

  if (!patient) notFound()

  const p = patient as Patient
  const patientAppointments = (appointments as Appointment[]) ?? []
  const patientNotes = (notes as ClinicalNote[]) ?? []
  const now = new Date()

  const nextAppointment =
    patientAppointments
      .filter((appointment) => new Date(appointment.fecha_inicio) > now)
      .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())[0] ?? null

  const lastPastAppointment =
    patientAppointments
      .filter((appointment) => new Date(appointment.fecha_inicio) <= now)
      .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())[0] ?? null

  const latestNote = patientNotes[0] ?? null

  const pendingPaymentsCount = patientAppointments.filter(
    (appointment) => appointment.estado_sesion === 'asistio' && appointment.estado_pago === 'pendiente'
  ).length

  const oldestPendingPayment =
    patientAppointments
      .filter((appointment) => appointment.estado_sesion === 'asistio' && appointment.estado_pago === 'pendiente')
      .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())[0] ?? null

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
        <section
          className="relative rounded-[18px] p-3"
          style={{
            background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
            border: '1px solid var(--border-glass-white)',
            boxShadow: 'var(--shadow-glass)',
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          }}
        >
          <div className="mb-2">
            <div>
              <h2 className="editorial-panel-title text-[1.12rem] sm:text-[1.2rem]" style={{ color: 'var(--ink-cool-strong)' }}>
                Historia clínica
              </h2>
            </div>
          </div>

          <div className="relative space-y-2">
            {patientNotes.length === 0 && (
              <p className="py-3 text-center text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
                No hay notas clínicas aún
              </p>
            )}
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
                {note.texto && (
                  <p className="line-clamp-2 text-[12px] leading-5" style={{ color: 'var(--ink-cool)' }}>
                    Nota de sesión
                  </p>
                )}
                {note.canvas_url && (
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>Nota de sesión</p>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section
          className="relative rounded-[18px] p-3"
          style={{
            background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
            border: '1px solid var(--border-glass-white)',
            boxShadow: 'var(--shadow-glass)',
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          }}
        >
          <div className="mb-2">
            <div>
              <h2 className="editorial-panel-title text-[1.12rem] sm:text-[1.2rem]" style={{ color: 'var(--ink-cool-strong)' }}>
                Historial de citas
              </h2>
            </div>
          </div>

          <div className="relative space-y-2">
            {patientAppointments.length === 0 && (
              <p className="py-3 text-center text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>Sin citas registradas</p>
            )}
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
                    <span className={
                      apt.estado_sesion === 'asistio'    ? 'status-badge status-badge--success' :
                      apt.estado_sesion === 'cancelo'    ? 'status-badge status-badge--cancel' :
                      apt.estado_sesion === 'no_asistio' ? 'status-badge status-badge--warning' :
                                                           'status-badge status-badge--inactive'
                    }>
                      {apt.estado_sesion === 'asistio' ? 'Asistió' :
                       apt.estado_sesion === 'cancelo' ? 'Canceló' :
                       apt.estado_sesion === 'no_asistio' ? 'No asistió' : 'Programada'}
                    </span>
                    <span className={apt.estado_pago === 'pagado' ? 'status-badge status-badge--success' : 'status-badge status-badge--pending'}>
                      {apt.estado_pago === 'pagado' ? 'Pagada' : 'Pendiente de pago'}
                    </span>
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
