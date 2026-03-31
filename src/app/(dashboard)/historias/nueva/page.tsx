'use client'
// ============================================================
// NUEVA HISTORIA CLÍNICA — formulario con canvas + texto
// Recibe ?paciente=uuid en la URL para asociar la nota al paciente
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DrawingCanvas from '@/components/historias/DrawingCanvas'
import { ArrowLeft, Save } from 'lucide-react'
import { Patient } from '@/types'
import { createClinicalNote, uploadClinicalNoteCanvas } from '@/lib/clinical-notes'
import { mapPatientRow } from '@/lib/supabase/mappers'

export default function NuevaHistoriaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteId = searchParams.get('paciente')  // viene de la URL
  const [supabase] = useState(() => createClient())

  const [patient, setPatient] = useState<Patient | null>(null)
  const [texto, setTexto] = useState('')
  const [canvasDataUrl, setCanvasDataUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Cargamos el nombre del paciente para mostrarlo en el header
  useEffect(() => {
    if (!pacienteId) return
    supabase.from('patients').select('*').eq('id', pacienteId).single()
      .then(({ data }) => setPatient(data ? mapPatientRow(data) : null))
  }, [pacienteId, supabase])

  async function handleSave() {
    if (!pacienteId) return
    setSaving(true)
    setSaveError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveError('Sesión expirada. Recarga la página.'); return }

      const canvasPath = await uploadClinicalNoteCanvas(supabase, user.id, canvasDataUrl)

      const { error } = await createClinicalNote(supabase, {
        patientId: pacienteId,
        userId: user.id,
        texto,
        canvasPath,
      })

      if (error) throw error

      router.push(`/pacientes/${pacienteId}`)
      router.refresh()
    } catch {
      setSaveError('No se pudo guardar la nota. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="p-2.5 rounded-2xl transition-colors"
          style={{ background: 'rgba(200,198,208,0.35)' }}>
          <ArrowLeft size={20} style={{ color: '#555555' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-light tracking-tight" style={{ color: '#111111' }}>
            Nueva nota clínica
          </h1>
          {patient && (
            <p className="text-sm mt-0.5" style={{ color: '#666666' }}>
              {patient.nombre} {patient.apellido}
            </p>
          )}
        </div>
        {/* Botón guardar — glass gris con rose */}
        <button
          onClick={handleSave}
          disabled={saving || (!texto && !canvasDataUrl)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: 'rgba(155, 142, 160, 0.90)', color: 'white' }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {saveError && (
        <p className="text-[12px] text-center mb-2" style={{ color: 'var(--state-cancel-text)' }}>
          {saveError}
        </p>
      )}

      <div className="space-y-4">
        {/* Canvas de escritura */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium tracking-widest uppercase mb-3"
            style={{ color: '#888888' }}>
            ✏️ Nota manuscrita
          </p>
          <DrawingCanvas
            onChange={setCanvasDataUrl}
          />
        </div>

        {/* Área de texto */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium tracking-widest uppercase mb-3"
            style={{ color: '#888888' }}>
            ⌨️ Notas con teclado
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Observaciones de la sesión, intervenciones, acuerdos para la próxima cita..."
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all resize-none"
            style={{ color: '#111111' }}
          />
        </div>
      </div>
    </div>
  )
}
