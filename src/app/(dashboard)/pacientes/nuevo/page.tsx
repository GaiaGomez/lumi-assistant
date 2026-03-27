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

  // Actualiza el campo correspondiente en el estado del formulario
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

  // Estilos reutilizables para inputs
  const inputStyle = {
    color: '#111111',
  }
  const labelStyle = {
    color: '#777777',
    fontSize: '11px',
    fontWeight: '500' as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="p-2.5 rounded-2xl transition-colors"
          style={{ background: 'rgba(200,198,208,0.35)' }}>
          <ArrowLeft size={20} style={{ color: '#555555' }} />
        </button>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: '#111111' }}>
          Nuevo paciente
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5" style={labelStyle}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block mb-1.5" style={labelStyle}>Apellido *</label>
            <input name="apellido" value={form.apellido} onChange={handleChange} required
              className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>
            WhatsApp <span style={{ textTransform: 'none', fontWeight: 400, color: '#BBBBBB' }}>(formato: 573001234567)</span>
          </label>
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
            placeholder="573001234567"
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>Teléfono</label>
          <input name="telefono" value={form.telefono} onChange={handleChange}
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>Notas generales</label>
          <textarea name="notas_generales" value={form.notas_generales} onChange={handleChange}
            rows={3} placeholder="Motivo de consulta, antecedentes..."
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all resize-none"
            style={inputStyle}
          />
        </div>

        {saveError && (
          <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
            {saveError}
          </p>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-medium transition-opacity disabled:opacity-50 mt-2"
          style={{ background: 'rgba(155, 142, 160, 0.90)' }}>
          {saving ? 'Guardando...' : 'Guardar paciente'}
        </button>
      </form>
    </div>
  )
}
