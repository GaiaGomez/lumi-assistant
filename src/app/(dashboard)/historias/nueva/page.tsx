'use client'
// ============================================================
// NUEVA HISTORIA CLÍNICA — formulario con canvas + texto
// Recibe ?paciente=uuid en la URL para asociar la nota al paciente
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DrawingCanvas from '@/components/historias/DrawingCanvas'
import { ArrowLeft, Save } from 'lucide-react'
import { Patient } from '@/types'

export default function NuevaHistoriaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteId = searchParams.get('paciente')  // viene de la URL
  const supabase = createClient()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [texto, setTexto] = useState('')      // notas escritas con teclado
  const [canvasDataUrl, setCanvasDataUrl] = useState('')  // imagen del canvas en base64
  const [saving, setSaving] = useState(false)

  // Cargamos el nombre del paciente para mostrarlo en el header
  useEffect(() => {
    if (!pacienteId) return
    supabase.from('patients').select('*').eq('id', pacienteId).single()
      .then(({ data }) => setPatient(data))
  }, [pacienteId])

  async function handleSave() {
    if (!pacienteId) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    let canvas_url: string | null = null

    // Si hay algo dibujado en el canvas, lo subimos a Supabase Storage
    if (canvasDataUrl) {
      // Convertimos base64 a Blob (binario) para poder subirlo como archivo
      const response = await fetch(canvasDataUrl)
      const blob = await response.blob()

      // Nombre del archivo: userId/timestamp.png
      // La carpeta por userId es importante para las políticas RLS de Storage
      const fileName = `${user!.id}/${Date.now()}.png`

      const { data: uploadData } = await supabase.storage
        .from('canvas-notes')
        .upload(fileName, blob, { contentType: 'image/png' })

      if (uploadData) {
        // getPublicUrl devuelve la URL pública de la imagen guardada
        const { data: { publicUrl } } = supabase.storage
          .from('canvas-notes')
          .getPublicUrl(uploadData.path)
        canvas_url = publicUrl
      }
    }

    // Guardamos la nota en la tabla clinical_notes
    await supabase.from('clinical_notes').insert({
      patient_id: pacienteId,
      user_id: user!.id,
      texto: texto || null,
      canvas_url,
    })

    router.push(`/pacientes/${pacienteId}`)
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="p-2.5 rounded-2xl transition-colors"
          style={{ background: 'rgba(217,201,184,0.2)' }}>
          <ArrowLeft size={20} style={{ color: '#8B7355' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-light tracking-tight" style={{ color: '#2D2520' }}>
            Nueva nota clínica
          </h1>
          {patient && (
            <p className="text-sm mt-0.5" style={{ color: '#9C8878' }}>
              {patient.nombre} {patient.apellido}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || (!texto && !canvasDataUrl)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #8B7355 0%, #6B8F6B 100%)', color: 'white' }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Canvas de escritura — la estrella del show para el iPad */}
        <div className="glass rounded-2xl p-4"
>
          <p className="text-xs font-medium tracking-widest uppercase mb-3"
            style={{ color: '#9C8878' }}>
            ✏️ Nota manuscrita
          </p>
          <DrawingCanvas
            onChange={setCanvasDataUrl}
          />
        </div>

        {/* Área de texto — para notas rápidas con teclado */}
        <div className="glass rounded-2xl p-4"
>
          <p className="text-xs font-medium tracking-widest uppercase mb-3"
            style={{ color: '#9C8878' }}>
            ⌨️ Notas con teclado
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Observaciones de la sesión, intervenciones, acuerdos para la próxima cita..."
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all resize-none"
            style={{ color: '#2D2520' }}
          />
        </div>
      </div>
    </div>
  )
}
