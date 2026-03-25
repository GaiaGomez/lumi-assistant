'use client'
// ============================================================
// APPOINTMENT MODAL — detalle de una cita
// Permite cambiar estado de sesión y pago con un toque
// Acceso directo a la historia clínica del paciente
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, MessageCircle } from 'lucide-react'
import { Appointment } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { linkRecordatorioCita } from '@/lib/whatsapp'

interface AppointmentModalProps {
  appointment: Appointment
  onClose: () => void
}

// Opciones de estado de la sesión
const ESTADOS_SESION = [
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'asistio',     label: 'Asistió' },
  { value: 'cancelo',     label: 'Canceló' },
  { value: 'no_asistio',  label: 'No asistió' },
]

export default function AppointmentModal({ appointment, onClose }: AppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  // Estado local: copiamos los valores actuales para modificarlos sin afectar el padre
  const [estadoSesion, setEstadoSesion] = useState(appointment.estado_sesion)
  const [estadoPago, setEstadoPago] = useState(appointment.estado_pago)
  const [saving, setSaving] = useState(false)

  const fechaFormateada = new Date(appointment.fecha_inicio).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  // Guarda los cambios en Supabase y actualiza la UI
  async function guardarCambios() {
    setSaving(true)
    await supabase
      .from('appointments')
      .update({ estado_sesion: estadoSesion, estado_pago: estadoPago })
      .eq('id', appointment.id)

    setSaving(false)
    router.refresh()  // hace que la página recargue los datos del servidor
    onClose()
  }

  // Estilos activos para estado sesión — glass gris con toque semántico sutil
  const activeStyles: Record<string, { bg: string; color: string }> = {
    pendiente:  { bg: 'rgba(158,152,165,0.22)', color: '#444444' },
    asistio:    { bg: 'rgba(130,162,158,0.22)', color: '#2A5A55' },
    cancelo:    { bg: 'rgba(195,155,155,0.30)', color: '#7A2E2E' },
    no_asistio: { bg: 'rgba(180,168,130,0.28)', color: '#6A4E18' },
  }

  return (
    // Overlay con blur suave — al tocar fuera del modal se cierra
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(30,25,35,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Contenido del modal glassmorphism — stopPropagation evita que el click cierre el modal */}
      <div
        className="glass w-full max-w-md rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(120,110,130,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5">
          <div>
            <h2 className="font-semibold text-lg" style={{ color: '#111111' }}>
              {appointment.patient?.nombre} {appointment.patient?.apellido}
            </h2>
            <p className="text-sm mt-0.5 capitalize" style={{ color: '#666666' }}>{fechaFormateada}</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'rgba(205,200,210,0.25)' }}>
            <X size={18} style={{ color: '#777777' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Estado de la sesión */}
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-2.5"
              style={{ color: '#888888' }}>Estado de la sesión</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_SESION.map(({ value, label }) => {
                const isActive = estadoSesion === value
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoSesion(value as typeof estadoSesion)}
                    className="py-2.5 px-3 rounded-2xl text-sm font-medium transition-all"
                    style={isActive ? {
                      background: activeStyles[value].bg,
                      color: activeStyles[value].color,
                    } : {
                      background: 'rgba(255,255,255,0.4)',
                      color: '#AAAAAA',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estado del pago */}
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-2.5"
              style={{ color: '#888888' }}>Estado del pago</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pendiente', label: '⏳ Pendiente', bg: 'rgba(185,172,135,0.25)', color: '#6A4E18' },
                { value: 'pagado',    label: '✓ Pagado',     bg: 'rgba(130,162,158,0.22)', color: '#2A5A55' },
              ].map(({ value, label, bg, color }) => {
                const isActive = estadoPago === value
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoPago(value as typeof estadoPago)}
                    className="py-2.5 px-3 rounded-2xl text-sm font-medium transition-all"
                    style={isActive ? {
                      background: bg,
                      color,
                    } : {
                      background: 'rgba(255,255,255,0.4)',
                      color: '#AAAAAA',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Acciones secundarias */}
          <div className="flex gap-2 pt-1">
            {/* Ir a la historia clínica de este paciente */}
            <button
              onClick={() => router.push(`/pacientes/${appointment.patient_id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium transition-all"
              style={{ background: 'rgba(205,200,212,0.30)', color: '#555555' }}
            >
              <FileText size={16} />
              Historia clínica
            </button>

            {/* Abrir WhatsApp con mensaje pre-escrito — verde se mantiene por branding de WA */}
            {appointment.patient?.whatsapp && (
              <a
                href={linkRecordatorioCita(appointment.patient, appointment)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4CAF6B 0%, #3D9E59 100%)', color: 'white' }}
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            )}
          </div>

          {/* Botón guardar — glass gris con rose sutil */}
          <button
            onClick={guardarCambios}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-white font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(155, 142, 160, 0.90)' }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
