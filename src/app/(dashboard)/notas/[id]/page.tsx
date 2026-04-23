export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSessionNoteById } from '@/lib/notes/actions'
import { createClient } from '@/lib/supabase/server'
import PageBlobs from '@/components/ui/PageBlobs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NotaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const note = await getSessionNoteById(id)
  if (!note) notFound()

  const { data: patient } = await supabase
    .from('patients')
    .select('nombre, apellido')
    .eq('id', note.patientId)
    .single()

  const patientName = patient
    ? `${patient.nombre} ${patient.apellido}`
    : 'Paciente'

  const fecha = new Date(note.createdAt).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formalFields = [
    { label: '¿Cómo llegó hoy?', value: note.comoLlego },
    { label: '¿Qué trabajaron?', value: note.queTrabajaron },
    { label: '¿Cómo va el proceso?', value: note.comoVaProceso },
    { label: '¿Qué sigue?', value: note.queSigue },
  ]

  const hasFormalContent = formalFields.some((f) => f.value)

  return (
    <div className="relative pb-6">
      <PageBlobs />

      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <Link
          href={`/pacientes/${note.patientId}`}
          className="btn-subtle mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <p className="section-kicker mb-0.5">{patientName}</p>
          <h1 className="page-title text-[1.6rem] leading-none">
            Sesión #{note.sessionNumber ?? '—'}
          </h1>
          <p className="mt-1 text-[13px] capitalize" style={{ color: 'var(--ink-cool-soft)' }}>
            {fecha}
          </p>
        </div>
        <div className="ml-auto">
          {note.isDraft ? (
            <span
              className="rounded-full px-2.5 py-1 text-[11px]"
              style={{
                background: 'var(--state-pending-bg)',
                color: 'var(--state-pending-text)',
              }}
            >
              Borrador
            </span>
          ) : note.signedAt ? (
            <span
              className="rounded-full px-2.5 py-1 text-[11px]"
              style={{
                background: 'var(--state-success-bg)',
                color: 'var(--state-success-text)',
              }}
            >
              Firmada el{' '}
              {new Date(note.signedAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Notas de sesión (texto libre) */}
        {note.quickNote && (
          <section className="glass-cool rounded-[18px] p-3">
            <p className="section-kicker mb-1.5">Notas de sesión</p>
            <p
              className="text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{
                fontFamily: 'Iowan Old Style, Georgia, serif',
                color: 'var(--ink-cool-strong)',
              }}
            >
              {note.quickNote}
            </p>
          </section>
        )}

        {/* Nota formal */}
        {hasFormalContent && (
          <section className="glass-cool rounded-[18px] p-3">
            <h2 className="editorial-panel-title mb-2.5 text-[1.05rem]">Nota formal</h2>
            <div className="space-y-3">
              {formalFields.map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <p className="section-kicker mb-1">{label}</p>
                    <p
                      className="text-[14px] leading-relaxed whitespace-pre-wrap"
                      style={{ color: 'var(--ink-cool-strong)' }}
                    >
                      {value}
                    </p>
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        {!note.quickNote && !hasFormalContent && (
          <section className="glass-cool rounded-[18px] p-3">
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
              Esta nota no tiene contenido todavía.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
