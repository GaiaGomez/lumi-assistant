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

  // Actualiza el campo correspondiente en el estado del formulario
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('patients').insert({
      ...form,
      user_id: user!.id,
      fecha_inicio: new Date().toISOString().split('T')[0],  // fecha de hoy
    })

    router.push('/pacientes')
    router.refresh()
  }

  // Estilos reutilizables para inputs — glassmorphism cálido
  const inputStyle = {
    color: '#2D2520',
  }
  const labelStyle = {
    color: '#9C8878',
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
          style={{ background: 'rgba(217,201,184,0.2)' }}>
          <ArrowLeft size={20} style={{ color: '#8B7355' }} />
        </button>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: '#2D2520' }}>
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
            WhatsApp <span style={{ textTransform: 'none', fontWeight: 400, color: '#C4B4A4' }}>(formato: 573001234567)</span>
          </label>
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
            placeholder="573001234567"
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
            style={inputStyle}
            onFocus={e => e.target.style.border = '1.5px solid #C4A882'}
            onBlur={e => e.target.style.border = '1.5px solid rgba(217,201,184,0.6)'}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>Teléfono</label>
          <input name="telefono" value={form.telefono} onChange={handleChange}
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
            style={inputStyle}
            onFocus={e => e.target.style.border = '1.5px solid #C4A882'}
            onBlur={e => e.target.style.border = '1.5px solid rgba(217,201,184,0.6)'}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all"
            style={inputStyle}
            onFocus={e => e.target.style.border = '1.5px solid #C4A882'}
            onBlur={e => e.target.style.border = '1.5px solid rgba(217,201,184,0.6)'}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={labelStyle}>Notas generales</label>
          <textarea name="notas_generales" value={form.notas_generales} onChange={handleChange}
            rows={3} placeholder="Motivo de consulta, antecedentes..."
            className="w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-all resize-none"
            style={inputStyle}
            onFocus={e => e.target.style.border = '1.5px solid #C4A882'}
            onBlur={e => e.target.style.border = '1.5px solid rgba(217,201,184,0.6)'}
          />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-medium transition-opacity disabled:opacity-50 mt-2"
          style={{ background: 'linear-gradient(135deg, #8B7355 0%, #6B8F6B 100%)' }}>
          {saving ? 'Guardando...' : 'Guardar paciente'}
        </button>
      </form>
    </div>
  )
}
