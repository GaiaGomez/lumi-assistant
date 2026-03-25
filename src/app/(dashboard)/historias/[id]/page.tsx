export const dynamic = 'force-dynamic'
// ============================================================
// VER HISTORIA CLÍNICA — muestra una nota existente
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClinicalNote, Patient } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function HistoriaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: note } = await supabase
    .from('clinical_notes')
    .select('*, patient:patients(*)')
    .eq('id', id)
    .single()

  if (!note) notFound()

  const clinicalNote = note as ClinicalNote & { patient: Patient }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/pacientes/${clinicalNote.patient_id}`}
          className="p-2.5 rounded-2xl transition-colors"
          style={{ background: 'rgba(217,201,184,0.2)' }}
        >
          <ArrowLeft size={20} style={{ color: '#8B7355' }} />
        </Link>
        <div>
          <h1 className="text-xl font-light tracking-tight" style={{ color: '#2D2520' }}>
            {clinicalNote.patient.nombre} {clinicalNote.patient.apellido}
          </h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: '#9C8878' }}>
            {new Date(clinicalNote.created_at).toLocaleDateString('es-CO', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Canvas manuscrito */}
        {clinicalNote.canvas_url && (
          <div className="glass rounded-2xl p-4"
>
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#9C8878' }}>
              ✏️ Nota manuscrita
            </p>
            {/* Mostramos la imagen del canvas guardada en Supabase Storage */}
            <img
              src={clinicalNote.canvas_url}
              alt="Nota manuscrita"
              className="w-full rounded-2xl"
              />
          </div>
        )}

        {/* Texto */}
        {clinicalNote.texto && (
          <div className="glass rounded-2xl p-4"
>
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#9C8878' }}>
              ⌨️ Notas de teclado
            </p>
            <p className="whitespace-pre-wrap leading-relaxed" style={{ color: '#2D2520' }}>
              {clinicalNote.texto}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
