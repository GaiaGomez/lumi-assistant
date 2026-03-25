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
          className="p-2 hover:bg-stone-100 rounded-lg"
        >
          <ArrowLeft size={20} className="text-stone-600" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-stone-800">
            {clinicalNote.patient.nombre} {clinicalNote.patient.apellido}
          </h1>
          <p className="text-stone-500 text-sm">
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
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-medium text-stone-500 mb-3">✏️ Nota manuscrita</p>
            {/* Mostramos la imagen del canvas guardada en Supabase Storage */}
            <img
              src={clinicalNote.canvas_url}
              alt="Nota manuscrita"
              className="w-full rounded-xl border border-stone-100"
            />
          </div>
        )}

        {/* Texto */}
        {clinicalNote.texto && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-medium text-stone-500 mb-2">⌨️ Notas de teclado</p>
            <p className="text-stone-800 whitespace-pre-wrap">{clinicalNote.texto}</p>
          </div>
        )}
      </div>
    </div>
  )
}
