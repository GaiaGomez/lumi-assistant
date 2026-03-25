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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft size={20} className="text-stone-600" />
        </button>
        <h1 className="text-2xl font-semibold text-stone-800">Nuevo paciente</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Apellido *</label>
            <input name="apellido" value={form.apellido} onChange={handleChange} required
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            WhatsApp <span className="text-stone-400 font-normal">(formato: 573001234567)</span>
          </label>
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
            placeholder="573001234567"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
          <input name="telefono" value={form.telefono} onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notas generales</label>
          <textarea name="notas_generales" value={form.notas_generales} onChange={handleChange}
            rows={3} placeholder="Motivo de consulta, antecedentes..."
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base resize-none" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white font-medium rounded-xl transition-colors">
          {saving ? 'Guardando...' : 'Guardar paciente'}
        </button>
      </form>
    </div>
  )
}
