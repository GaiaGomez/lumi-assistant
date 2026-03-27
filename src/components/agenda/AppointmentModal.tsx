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
  const [saveError, setSaveError] = useState<string | null>(null)

  const fechaFormateada = new Date(appointment.fecha_inicio).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  // Guarda los cambios en Supabase y actualiza la UI
  async function guardarCambios() {
    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ estado_sesion: estadoSesion, estado_pago: estadoPago })
        .eq('id', appointment.id)

      if (error) throw error

      router.refresh()  // hace que la página recargue los datos del servidor
      onClose()
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Estilos activos para estado sesión — usa tokens del sistema
  const activeStyles: Record<string, { bg: string; color: string }> = {
    pendiente:  { bg: 'var(--state-inactive-bg)',  color: 'var(--ink)' },
    asistio:    { bg: 'var(--state-success-bg)',   color: 'var(--state-success-text)' },
    cancelo:    { bg: 'var(--state-cancel-bg)',    color: 'var(--state-cancel-text)' },
    no_asistio: { bg: 'var(--state-warning-bg)',   color: 'var(--state-warning-text)' },
  }

  return (
    // Overlay con blur suave — al tocar fuera del modal se cierra
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'var(--overlay-modal)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-md rounded-[34px] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-medium)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6">
          <div>
            <p className="section-kicker mb-2">Detalle de cita</p>
            <h2 className="editorial-title text-[1.5rem]" style={{ color: 'var(--ink-strong)' }}>
              {appointment.patient?.nombre} {appointment.patient?.apellido}
            </h2>
            <p className="text-sm mt-1 capitalize" style={{ color: 'var(--ink-soft)' }}>{fechaFormateada}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="btn-secondary p-2.5"
            style={{ color: 'var(--ink-soft)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="section-kicker mb-2.5">Estado de la sesión</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_SESION.map(({ value, label }) => {
                const isActive = estadoSesion === value
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoSesion(value as typeof estadoSesion)}
                    className="py-2.5 px-3 rounded-[18px] text-sm font-medium transition-all"
                    style={isActive ? {
                      background: activeStyles[value].bg,
                      color: activeStyles[value].color,
                      border: '1px solid rgba(255,255,255,0.14)',
                    } : {
                      background: 'rgba(255,255,255,0.42)',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="section-kicker mb-2.5">Estado del pago</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pendiente', label: '⏳ Pendiente', bg: 'var(--state-pending-bg)', color: 'var(--state-pending-text)' },
                { value: 'pagado',    label: '✓ Pagado',     bg: 'var(--state-success-bg)', color: 'var(--state-success-text)' },
              ].map(({ value, label, bg, color }) => {
                const isActive = estadoPago === value
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoPago(value as typeof estadoPago)}
                    className="py-2.5 px-3 rounded-[18px] text-sm font-medium transition-all"
                    style={isActive ? {
                      background: bg,
                      color,
                      border: '1px solid rgba(255,255,255,0.14)',
                    } : {
                      background: 'rgba(255,255,255,0.42)',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => router.push(`/pacientes/${appointment.patient_id}`)}
              className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
              style={{ color: 'var(--ink)' }}
            >
              <FileText size={16} />
              Historia clínica
            </button>

            {appointment.patient?.whatsapp && (
              <a
                href={linkRecordatorioCita(appointment.patient, appointment)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4c9667 0%, #3d8157 100%)', color: '#fffaf8', boxShadow: 'var(--shadow-soft)' }}
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {saveError}
            </p>
          )}

          <button
            onClick={guardarCambios}
            disabled={saving}
            className="btn-primary w-full py-3.5 text-sm font-medium tracking-[0.06em] uppercase disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
