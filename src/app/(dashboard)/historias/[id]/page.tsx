export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bookmark, CalendarDays, FilePenLine, PencilLine, SquarePen } from 'lucide-react'
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
    <section className="glass-cool rounded-[18px] p-3">
      <p className="section-kicker mb-0.5">{kicker}</p>
      <h2 className="editorial-panel-title text-[1.05rem]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default async function HistoriaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: note } = await supabase
    .from('clinical_notes')
    .select('id, patient_id, appointment_id, user_id, texto, canvas_url, canvas_paths, template_kind, template_data, is_draft, created_at, updated_at, patient:patients(*), appointment:appointments(*)')
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
    <div className="relative mx-auto max-w-[980px] space-y-2.5 font-sans">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/pacientes/${clinicalNote.patient_id}`}
          className="btn-subtle flex h-9 w-9 items-center justify-center"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="section-kicker mb-0.5">Nota clínica</p>
          <h1 className="page-title text-[1.6rem] leading-none">
            {clinicalNote.patient.nombre} {clinicalNote.patient.apellido}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--ink-cool-soft)' }}>
            Creada {formatDateTimeFull(clinicalNote.created_at)}
            {clinicalNote.updated_at !== clinicalNote.created_at ? ` · actualizada ${formatDateTimeFull(clinicalNote.updated_at)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/historias/${clinicalNote.id}/editar`}
            className="btn-subtle inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px]"
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

      {clinicalNote.is_draft && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3"
          style={{ background: 'var(--state-pending-bg)', border: '1px solid rgba(255,255,255,0.36)' }}
        >
          <div className="flex items-center gap-2">
            <Bookmark size={15} style={{ color: 'var(--state-pending-text)' }} />
            <p className="text-[14px]" style={{ color: 'var(--state-pending-text)' }}>
              Esta nota es un borrador — no forma parte de la historia clínica publicada.
            </p>
          </div>
          <Link
            href={`/historias/${clinicalNote.id}/editar`}
            className="btn-action inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            Publicar historia
          </Link>
        </div>
      )}

      <div className="grid gap-2.5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-2.5">
          {clinicalNote.template_data && (
            <SectionCard kicker="Plantilla DAP" title={clinicalNote.template_data.focus.trim() || 'Nota de progreso'}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
                    style={{ background: 'rgba(207,196,209,0.24)', color: 'var(--ink-cool-soft)' }}
                  >
                    <FilePenLine size={13} />
                    Formato DAP
                  </span>

                  {riskMeta && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px]"
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
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
                      style={{ background: 'rgba(255,255,255,0.52)', color: 'var(--ink-cool-soft)' }}
                    >
                      <CalendarDays size={13} />
                      {formatDateTimeFull(clinicalNote.appointment.fecha_inicio)}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
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
                        className="rounded-[14px] p-3"
                        style={{ background: 'rgba(255,255,255,0.46)', border: '1px solid var(--border-glass-white)' }}
                      >
                        <p className="section-kicker mb-1">{section.title}</p>
                        <p className="whitespace-pre-wrap text-[14px] leading-6" style={{ color: 'var(--ink-cool-strong)' }}>
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
              <p className="whitespace-pre-wrap text-[14px] leading-6" style={{ color: 'var(--ink-cool-strong)' }}>
                {clinicalNote.texto}
              </p>
            </SectionCard>
          )}
        </div>

        <div className="space-y-2.5">
          {canvasSignedUrl && (
            <SectionCard kicker="Canvas manuscrito" title="Registro visual de sesión">
              <div
                className="overflow-hidden rounded-[14px]"
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
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-cool-muted)' }}>
                <PencilLine size={13} />
                {clinicalNote.canvas_paths?.length
                  ? 'Esta version conserva trazos editables para futuras actualizaciones.'
                  : 'Canvas legacy disponible para consulta o reemplazo.'}
              </p>
            </SectionCard>
          )}

          {!clinicalNote.template_data && !clinicalNote.texto && (
            <SectionCard kicker="Historia clínica" title="Solo manuscrito">
              <p className="text-[14px] leading-6" style={{ color: 'var(--ink-cool-soft)' }}>
                Esta nota aún no tiene texto estructurado. Podés agregar una nota DAP
                para convertirla en historia clínica escrita.
              </p>
              <Link
                href={`/historias/${clinicalNote.id}/editar`}
                className="btn-action mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[13px]"
              >
                <FilePenLine size={14} />
                Agregar nota DAP
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
