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

  const palette = {
    ink: '#5A535D',
    inkFaint: '#7E7381',
    inkSoft: '#635965',
    glass: 'rgba(255,255,255,0.38)',
    glassStrong: 'rgba(255,255,255,0.52)',
    borderGlass: 'rgba(255,255,255,0.42)',
    shadowGlass: '0 10px 40px rgba(124, 108, 128, 0.10)',
  }

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
            background: `linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.42) 100%)`,
            border: `1px solid ${palette.borderGlass}`,
            boxShadow: palette.shadowGlass,
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          }}
        >
          <div className="mb-2">
            <div>
              <h2 className="editorial-panel-title text-[1.12rem] sm:text-[1.2rem]" style={{ color: '#3F3941' }}>
                Historia clínica
              </h2>
            </div>
          </div>

          <div className="relative space-y-2">
            {patientNotes.length === 0 && (
              <p className="py-3 text-center text-[13px]" style={{ color: palette.inkSoft }}>
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
                  border: `1px solid ${palette.borderGlass}`,
                  boxShadow: '0 8px 28px rgba(124, 108, 128, 0.08)',
                }}
              >
                <p className="mb-0.5 text-[11px] capitalize tracking-[0.03em]" style={{ color: palette.inkFaint }}>
                  {formatDateOnly(note.created_at)}
                </p>
                {note.texto && (
                  <p className="line-clamp-2 text-[12px] leading-5" style={{ color: palette.ink }}>
                    Nota de sesión
                  </p>
                )}
                {note.canvas_url && (
                  <p className="mt-0.5 text-[11px]" style={{ color: palette.inkSoft }}>Nota de sesión</p>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section
          className="relative rounded-[18px] p-3"
          style={{
            background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
            border: `1px solid ${palette.borderGlass}`,
            boxShadow: palette.shadowGlass,
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          }}
        >
          <div className="mb-2">
            <div>
              <h2 className="editorial-panel-title text-[1.12rem] sm:text-[1.2rem]" style={{ color: '#3F3941' }}>
                Historial de citas
              </h2>
            </div>
          </div>

          <div className="relative space-y-2">
            {patientAppointments.length === 0 && (
              <p className="py-3 text-center text-[13px]" style={{ color: palette.inkSoft }}>Sin citas registradas</p>
            )}
            {patientAppointments.map((apt) => (
              <div
                key={apt.id}
                className="rounded-[14px] p-[10px]"
                style={{
                  minHeight: '52px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.32) 100%)',
                  border: `1px solid ${palette.borderGlass}`,
                  boxShadow: '0 10px 24px rgba(124, 108, 128, 0.07)',
                }}
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] leading-5" style={{ color: palette.ink }}>
                    {formatDateTimeFull(apt.fecha_inicio)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={apt.estado_sesion === 'asistio'
                        ? { background: 'rgba(206, 221, 212, 0.58)', color: '#66796E', border: '1px solid rgba(255,255,255,0.36)' }
                        : apt.estado_sesion === 'cancelo'
                        ? { background: 'rgba(233, 214, 218, 0.58)', color: '#8A6F76', border: '1px solid rgba(255,255,255,0.36)' }
                        : apt.estado_sesion === 'no_asistio'
                        ? { background: 'rgba(236, 225, 212, 0.64)', color: '#8E7564', border: '1px solid rgba(255,255,255,0.36)' }
                        : { background: 'rgba(216, 209, 218, 0.62)', color: '#736977', border: '1px solid rgba(255,255,255,0.36)' }
                      }>
                      {apt.estado_sesion === 'asistio' ? 'Asistió' :
                       apt.estado_sesion === 'cancelo' ? 'Canceló' :
                       apt.estado_sesion === 'no_asistio' ? 'No asistió' : 'Programada'}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={apt.estado_pago === 'pagado'
                        ? { background: 'rgba(206, 221, 212, 0.58)', color: '#66796E', border: '1px solid rgba(255,255,255,0.36)' }
                        : { background: 'rgba(236, 225, 212, 0.64)', color: '#8E7564', border: '1px solid rgba(255,255,255,0.36)' }
                      }>
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
