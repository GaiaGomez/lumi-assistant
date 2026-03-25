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
    // Overlay oscuro — al tocar fuera del modal se cierra
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Contenido del modal — stopPropagation evita que el click cierre el modal */}
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-stone-100">
          <div>
            <h2 className="font-semibold text-stone-800 text-lg">
              {appointment.patient?.nombre} {appointment.patient?.apellido}
            </h2>
            <p className="text-stone-500 text-sm mt-0.5 capitalize">{fechaFormateada}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Estado de la sesión */}
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Estado de la sesión</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_SESION.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setEstadoSesion(value as typeof estadoSesion)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                    estadoSesion === value
                      ? `${color} border-current`
                      : 'bg-stone-50 text-stone-400 border-transparent hover:border-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado del pago */}
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Estado del pago</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pendiente', label: '⏳ Pendiente', color: 'bg-yellow-100 text-yellow-700' },
                { value: 'pagado',    label: '✓ Pagado',     color: 'bg-green-100 text-green-700' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setEstadoPago(value as typeof estadoPago)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                    estadoPago === value
                      ? `${color} border-current`
                      : 'bg-stone-50 text-stone-400 border-transparent hover:border-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            {/* Ir a la historia clínica de este paciente */}
            <button
              onClick={() => router.push(`/pacientes/${appointment.patient_id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-medium transition-colors"
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors"
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
            className="w-full py-3 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white font-medium rounded-xl transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
