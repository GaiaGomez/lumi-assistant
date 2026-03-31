export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, FilePenLine, PencilLine, SquarePen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createClinicalNoteCanvasSignedUrl } from '@/lib/clinical-notes'
import { CLINICAL_NOTE_RISK_META } from '@/lib/clinical-note-template'
import { formatDateTimeFull } from '@/lib/format'
import { mapClinicalNoteRow } from '@/lib/supabase/mappers'
import ClinicalNoteDeleteButton from '@/components/historias/ClinicalNoteDeleteButton'

interface Props {
  params: Promise<{ id: string }>
}

function SectionCard({
  kicker,
  title,
  children,
}: {
  kicker: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="glass rounded-[28px] p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
        {kicker}
      </p>
      <h2 className="mt-1 text-[1.08rem] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default async function HistoriaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: note } = await supabase
    .from('clinical_notes')
    .select('id, patient_id, appointment_id, user_id, texto, canvas_url, canvas_paths, template_kind, template_data, created_at, updated_at, patient:patients(*), appointment:appointments(*)')
    .eq('id', id)
    .single()

  if (!note) notFound()

  const clinicalNote = mapClinicalNoteRow(note)
  if (!clinicalNote.patient) notFound()

  let canvasSignedUrl: string | null = null
  if (clinicalNote.canvas_url) {
    canvasSignedUrl = await createClinicalNoteCanvasSignedUrl(supabase, clinicalNote.canvas_url)
  }

  const riskMeta = clinicalNote.template_data?.riskLevel
    ? CLINICAL_NOTE_RISK_META[clinicalNote.template_data.riskLevel]
    : null

  return (
    <div className="mx-auto max-w-[980px] space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/pacientes/${clinicalNote.patient_id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: 'rgba(255,255,255,0.46)',
            border: '1px solid rgba(255,255,255,0.42)',
            color: 'var(--ink-cool-soft)',
          }}
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
            Nota clinica
          </p>
          <h1 className="page-title text-[1.75rem]" style={{ color: 'var(--ink-cool-strong)' }}>
            {clinicalNote.patient.nombre} {clinicalNote.patient.apellido}
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-cool-soft)' }}>
            Creada {formatDateTimeFull(clinicalNote.created_at)}
            {clinicalNote.updated_at !== clinicalNote.created_at ? ` · actualizada ${formatDateTimeFull(clinicalNote.updated_at)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/historias/${clinicalNote.id}/editar`}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            style={{ background: 'rgba(207,196,209,0.24)', color: 'var(--ink-cool-strong)' }}
          >
            <SquarePen size={15} />
            Editar
          </Link>
          <ClinicalNoteDeleteButton
            noteId={clinicalNote.id}
            patientId={clinicalNote.patient_id}
            canvasUrl={clinicalNote.canvas_url}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {clinicalNote.template_data && (
            <SectionCard kicker="Plantilla DAP" title={clinicalNote.template_data.focus.trim() || 'Nota de progreso'}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                    style={{ background: 'rgba(207,196,209,0.24)', color: 'var(--ink-cool-soft)' }}
                  >
                    <FilePenLine size={13} />
                    Formato DAP
                  </span>

                  {riskMeta && (
                    <span
                      className="rounded-full px-3 py-1.5 text-xs"
                      style={{
                        background: riskMeta.tone === 'success'
                          ? 'var(--state-success-bg)'
                          : riskMeta.tone === 'warning'
                            ? 'var(--state-warning-bg)'
                            : 'var(--state-cancel-bg)',
                        color: riskMeta.tone === 'success'
                          ? 'var(--state-success-text)'
                          : riskMeta.tone === 'warning'
                            ? 'var(--state-warning-text)'
                            : 'var(--state-cancel-text)',
                      }}
                    >
                      {riskMeta.label}
                    </span>
                  )}

                  {clinicalNote.appointment && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                      style={{ background: 'rgba(255,255,255,0.52)', color: 'var(--ink-cool-soft)' }}
                    >
                      <CalendarDays size={13} />
                      {formatDateTimeFull(clinicalNote.appointment.fecha_inicio)}
                    </span>
                  )}
                </div>

                <div className="grid gap-3">
                  {[
                    {
                      key: 'data',
                      title: 'D · Data',
                      value: clinicalNote.template_data.data,
                    },
                    {
                      key: 'assessment',
                      title: 'A · Assessment',
                      value: clinicalNote.template_data.assessment,
                    },
                    {
                      key: 'plan',
                      title: 'P · Plan',
                      value: clinicalNote.template_data.plan,
                    },
                  ]
                    .filter((section) => section.value.trim())
                    .map((section) => (
                      <div
                        key={section.key}
                        className="rounded-[20px] p-4"
                        style={{ background: 'rgba(255,255,255,0.46)', border: '1px solid rgba(255,255,255,0.42)' }}
                      >
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
                          {section.title}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--ink-cool-strong)' }}>
                          {section.value}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </SectionCard>
          )}

          {clinicalNote.texto && (
            <SectionCard kicker="Texto libre" title="Observaciones complementarias">
              <p className="whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--ink-cool-strong)' }}>
                {clinicalNote.texto}
              </p>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4">
          {canvasSignedUrl && (
            <SectionCard kicker="Canvas manuscrito" title="Registro visual de sesion">
              <div
                className="overflow-hidden rounded-[24px]"
                style={{ border: '1px solid rgba(255,255,255,0.42)', boxShadow: '0 18px 42px rgba(120,110,130,0.10)' }}
              >
                <Image
                  src={canvasSignedUrl}
                  alt="Nota manuscrita"
                  width={1600}
                  height={1200}
                  unoptimized
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-cool-muted)' }}>
                <PencilLine size={13} />
                {clinicalNote.canvas_paths?.length
                  ? 'Esta version conserva trazos editables para futuras actualizaciones.'
                  : 'Canvas legacy disponible para consulta o reemplazo.'}
              </p>
            </SectionCard>
          )}

          {!clinicalNote.template_data && !clinicalNote.texto && (
            <SectionCard kicker="Nota" title="Sin contenido escrito">
              <p className="text-sm" style={{ color: 'var(--ink-cool-soft)' }}>
                Esta nota depende solo del canvas manuscrito.
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
