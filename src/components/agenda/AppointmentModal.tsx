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

// Opciones de estado de la sesión con su color visual
const ESTADOS_SESION = [
  { value: 'pendiente',   label: 'Pendiente',    color: 'bg-stone-100 text-stone-600' },
  { value: 'asistio',     label: 'Asistió',      color: 'bg-green-100 text-green-700' },
  { value: 'cancelo',     label: 'Canceló',      color: 'bg-red-100 text-red-700' },
  { value: 'no_asistio',  label: 'No asistió',   color: 'bg-orange-100 text-orange-700' },
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

  return (
    // Overlay con blur suave — al tocar fuera del modal se cierra
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(45,37,32,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Contenido del modal glassmorphism — stopPropagation evita que el click cierre el modal */}
      <div
        className="glass w-full max-w-md rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(139,115,85,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5"
          style={{ borderBottom: '1px solid rgba(217,201,184,0.3)' }}>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: '#2D2520' }}>
              {appointment.patient?.nombre} {appointment.patient?.apellido}
            </h2>
            <p className="text-sm mt-0.5 capitalize" style={{ color: '#9C8878' }}>{fechaFormateada}</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'rgba(217,201,184,0.2)' }}>
            <X size={18} style={{ color: '#9C8878' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Estado de la sesión */}
          <div>
            <p className="text-xs font-medium tracking-widest uppercase mb-2.5"
              style={{ color: '#9C8878' }}>Estado de la sesión</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_SESION.map(({ value, label }) => {
                const isActive = estadoSesion === value
                // Colores tierra/pastel para cada estado
                const activeStyles: Record<string, { bg: string; color: string }> = {
                  pendiente:  { bg: 'rgba(196,180,164,0.25)', color: '#8B7355' },
                  asistio:    { bg: 'rgba(143,174,139,0.25)', color: '#4A7A46' },
                  cancelo:    { bg: 'rgba(223,197,192,0.35)', color: '#8B4A42' },
                  no_asistio: { bg: 'rgba(220,180,140,0.3)',  color: '#8B5E2A' },
                }
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoSesion(value as typeof estadoSesion)}
                    className="py-2.5 px-3 rounded-2xl text-sm font-medium transition-all"
                    style={isActive ? {
                      background: activeStyles[value].bg,
                      color: activeStyles[value].color,
                      border: `1.5px solid ${activeStyles[value].color}40`,
                    } : {
                      background: 'rgba(255,255,255,0.4)',
                      color: '#C4B4A4',
                      border: '1.5px solid rgba(217,201,184,0.3)',
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
              style={{ color: '#9C8878' }}>Estado del pago</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pendiente', label: '⏳ Pendiente', bg: 'rgba(220,180,100,0.25)', color: '#8B6914' },
                { value: 'pagado',    label: '✓ Pagado',     bg: 'rgba(143,174,139,0.25)', color: '#4A7A46' },
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
                      border: `1.5px solid ${color}40`,
                    } : {
                      background: 'rgba(255,255,255,0.4)',
                      color: '#C4B4A4',
                      border: '1.5px solid rgba(217,201,184,0.3)',
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
              style={{ background: 'rgba(217,201,184,0.25)', color: '#8B7355', border: '1px solid rgba(196,168,130,0.3)' }}
            >
              <FileText size={16} />
              Historia clínica
            </button>

            {/* Abrir WhatsApp con mensaje pre-escrito */}
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

          {/* Botón guardar */}
          <button
            onClick={guardarCambios}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-white font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8B7355 0%, #6B8F6B 100%)' }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
