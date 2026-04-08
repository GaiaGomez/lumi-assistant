import Link from 'next/link'
import { FilePenLine, PencilLine } from 'lucide-react'
import type { ClinicalNote } from '@/types'
import { formatDateOnly } from '@/lib/format'
import {
  CLINICAL_NOTE_RISK_META,
  getClinicalNoteHeadline,
  getClinicalNoteSummary,
} from '@/lib/clinical-note-template'

interface ClinicalNoteSummaryCardProps {
  note: ClinicalNote
}

export default function ClinicalNoteSummaryCard({ note }: ClinicalNoteSummaryCardProps) {
  const riskMeta = note.template_data?.riskLevel
    ? CLINICAL_NOTE_RISK_META[note.template_data.riskLevel]
    : null
  const summary = getClinicalNoteSummary(note)
  const shouldShowSummary = summary !== 'Incluye canvas manuscrito.' && summary !== 'Sin contenido escrito.'
  const metaTags = [
    note.canvas_url ? 'Canvas' : null,
    note.template_data ? 'DAP' : null,
    riskMeta?.label ?? null,
    note.appointment_id ? 'Sesion' : null,
  ].filter(Boolean) as string[]

  return (
    <div
      className="rounded-[16px] px-3 py-2.5"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.28) 100%)',
        border: '1px solid var(--border-glass-white)',
        boxShadow: '0 10px 24px rgba(124, 108, 128, 0.08)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.03em]" style={{ color: 'var(--ink-cool-faint)' }}>
            {formatDateOnly(note.created_at)}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[14px] font-medium leading-5" style={{ color: 'var(--ink-cool-strong)' }}>
            {getClinicalNoteHeadline(note)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/historias/${note.id}`}
            className="rounded-full px-2.5 py-1 text-[11px]"
            style={{ background: 'rgba(255,255,255,0.52)', color: 'var(--ink-cool-strong)' }}
          >
            Ver
          </Link>
          <Link
            href={`/historias/${note.id}/editar`}
            className="rounded-full px-2.5 py-1 text-[11px]"
            style={{ background: 'rgba(207,196,209,0.24)', color: 'var(--ink-cool-strong)' }}
          >
            Editar
          </Link>
        </div>
      </div>

      {shouldShowSummary && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.35rem]" style={{ color: 'var(--ink-cool-soft)' }}>
          {summary}
        </p>
      )}

      {metaTags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {note.canvas_url && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: 'rgba(255,255,255,0.56)', color: 'var(--ink-cool-soft)' }}
            >
              <PencilLine size={11} />
              Canvas
            </span>
          )}
          {note.template_data && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: 'rgba(207,196,209,0.24)', color: 'var(--ink-cool-soft)' }}
            >
              <FilePenLine size={11} />
              DAP
            </span>
          )}
          {riskMeta && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
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
          {note.appointment_id && (
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,255,255,0.46)', color: 'var(--ink-cool-soft)' }}>
              Sesion
            </span>
          )}
        </div>
      )}
    </div>
  )
}
