'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteClinicalNoteById, deleteClinicalNoteCanvas } from '@/lib/clinical-notes'

interface ClinicalNoteDeleteButtonProps {
  noteId: string
  patientId: string
  canvasUrl: string | null
}

export default function ClinicalNoteDeleteButton({
  noteId,
  patientId,
  canvasUrl,
}: ClinicalNoteDeleteButtonProps) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    const confirmed = window.confirm('Esta accion eliminara la nota clinica. Deseas continuar?')
    if (!confirmed) return

    setDeleting(true)

    try {
      if (canvasUrl) {
        await deleteClinicalNoteCanvas(supabase, canvasUrl)
      }

      const { error } = await deleteClinicalNoteById(supabase, noteId)
      if (error) throw error

      router.push(`/pacientes/${patientId}`)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm disabled:opacity-45"
      style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
    >
      {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      {deleting ? 'Eliminando...' : 'Eliminar'}
    </button>
  )
}
