'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Patient } from '@/types'
import ModalShell from '@/components/ui/ModalShell'
import SectionHeader from '@/components/ui/SectionHeader'

interface Props {
  patient: Patient
}

interface FormState {
  nombre: string
  apellido: string
  telefono: string
  whatsapp: string
  email: string
  fecha_inicio: string
  notas_generales: string
}

function toForm(p: Patient): FormState {
  return {
    nombre: p.nombre,
    apellido: p.apellido,
    telefono: p.telefono ?? '',
    whatsapp: p.whatsapp ?? '',
    email: p.email ?? '',
    fecha_inicio: p.fecha_inicio ?? '',
    notas_generales: p.notas_generales ?? '',
  }
}

const fieldStyle = {
  background: 'rgba(255,255,255,0.66)',
  border: '1px solid rgba(255,255,255,0.46)',
  color: 'var(--ink-cool-strong)',
  boxShadow: '0 10px 28px rgba(124,108,128,0.06)',
}

export default function PatientEditModal({ patient }: Props) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => toForm(patient))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setForm(toForm(patient))
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError('Nombre y apellido son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('patients').update({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        fecha_inicio: form.fecha_inicio || null,
        notas_generales: form.notas_generales.trim() || null,
      }).eq('id', patient.id)
      if (err) throw err
      router.refresh()
      closeModal()
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Eliminar a ${patient.nombre} ${patient.apellido}? Esta acción también eliminará sus citas y notas clínicas.`
    )
    if (!confirmed) return
    setDeleting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('patients').delete().eq('id', patient.id)
      if (err) throw err
      router.push('/pacientes')
      router.refresh()
    } catch {
      setError('No se pudo eliminar el paciente.')
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="btn-subtle flex h-8 w-8 shrink-0 items-center justify-center"
        aria-label="Editar paciente"
      >
        <Pencil size={13} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <ModalShell onClose={closeModal} maxWidth="max-w-2xl">
          {/* Header */}
          <div className="flex items-start justify-between p-4">
            <div>
              <SectionHeader label="Paciente" className="mb-1" />
              <h2 className="editorial-panel-title text-[1.05rem]">
                {patient.nombre} {patient.apellido}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="btn-subtle flex h-8 w-8 shrink-0 items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] space-y-3">
            {/* Nombre / Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block space-y-1.5">
                <span className="section-kicker">Nombre *</span>
                <input
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                  style={fieldStyle}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="section-kicker">Apellido *</span>
                <input
                  value={form.apellido}
                  onChange={e => set('apellido', e.target.value)}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                  style={fieldStyle}
                />
              </label>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block space-y-1.5">
                <span className="section-kicker">WhatsApp</span>
                <input
                  value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  placeholder="573001234567"
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                  style={fieldStyle}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="section-kicker">Teléfono</span>
                <input
                  value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                  style={fieldStyle}
                />
              </label>
            </div>

            {/* Email / Fecha inicio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block space-y-1.5">
                <span className="section-kicker">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                  style={fieldStyle}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="section-kicker">Inicio proceso</span>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => set('fecha_inicio', e.target.value)}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                  style={fieldStyle}
                />
              </label>
            </div>

            {/* Notas generales */}
            <label className="block space-y-1.5">
              <span className="section-kicker">Notas generales</span>
              <textarea
                value={form.notas_generales}
                onChange={e => set('notas_generales', e.target.value)}
                rows={3}
                placeholder="Motivo de consulta, antecedentes, acuerdos..."
                className="w-full resize-none rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none"
                style={fieldStyle}
              />
            </label>

            {error && (
              <p className="text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] disabled:opacity-45"
                style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? 'Eliminando...' : 'Eliminar paciente'}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || deleting}
                className="btn-action inline-flex items-center gap-1.5 px-4 py-2 text-[14px] disabled:opacity-45"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </ModalShell>,
        document.body
      )}
    </>
  )
}
