'use client'
// ============================================================
// NUEVO PACIENTE PAGE — formulario para registrar un paciente
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function NuevoPacientePage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '', whatsapp: '', email: '', notas_generales: ''
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveError('Sesión expirada. Recarga la página.'); return }

      const { error } = await supabase.from('patients').insert({
        ...form,
        user_id: user.id,
        fecha_inicio: new Date().toISOString().split('T')[0],
      })

      if (error) throw error

      router.push('/pacientes')
      router.refresh()
    } catch {
      setSaveError('No se pudo guardar el paciente. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = {
    background: 'rgba(255,255,255,0.66)',
    border: '1px solid rgba(255,255,255,0.46)',
    color: 'var(--ink-cool-strong)',
    boxShadow: '0 10px 28px rgba(124,108,128,0.06)',
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-subtle flex h-8 w-8 items-center justify-center"
        >
          <ArrowLeft size={14} />
        </button>
        <div>
          <p className="section-kicker mb-0.5">Pacientes</p>
          <h1 className="page-title text-[1.6rem] leading-none">Nuevo paciente</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-cool rounded-[18px] p-4 space-y-3">

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="section-kicker">Nombre *</span>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className="w-full rounded-[14px] px-4 py-2.5 text-[14px] focus:outline-none"
              style={fieldStyle}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="section-kicker">Apellido *</span>
            <input name="apellido" value={form.apellido} onChange={handleChange} required
              className="w-full rounded-[14px] px-4 py-2.5 text-[14px] focus:outline-none"
              style={fieldStyle}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="section-kicker">
            WhatsApp{' '}
            <span className="normal-case font-normal tracking-normal" style={{ color: 'var(--ink-cool-muted)' }}>
              (formato: 573001234567)
            </span>
          </span>
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
            placeholder="573001234567"
            className="w-full rounded-[14px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={fieldStyle}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="section-kicker">Teléfono</span>
          <input name="telefono" value={form.telefono} onChange={handleChange}
            className="w-full rounded-[14px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={fieldStyle}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="section-kicker">Email</span>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full rounded-[14px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={fieldStyle}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="section-kicker">Notas generales</span>
          <textarea name="notas_generales" value={form.notas_generales} onChange={handleChange}
            rows={3} placeholder="Motivo de consulta, antecedentes..."
            className="w-full rounded-[14px] px-4 py-2.5 text-[14px] focus:outline-none resize-none"
            style={fieldStyle}
          />
        </label>

        {saveError && (
          <p className="text-[13px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
            {saveError}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving}
            className="btn-action px-5 py-2.5 text-[14px] tracking-[0.06em] uppercase disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}
