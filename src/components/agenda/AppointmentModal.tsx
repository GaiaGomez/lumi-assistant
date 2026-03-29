'use client'
// ============================================================
// APPOINTMENT MODAL — detalle de una cita
// Permite cambiar estado de sesión y pago con un toque
// Acceso directo a la historia clínica del paciente
// ============================================================

import { useState } from 'react'
import type React from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, MessageCircle, Monitor, MapPin, Leaf } from 'lucide-react'
import { Appointment, AppointmentModalidad } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { linkRecordatorioCita } from '@/lib/whatsapp'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'
import ModalShell from '@/components/ui/ModalShell'

interface AppointmentModalProps {
  appointment: Appointment
  onClose: () => void
}

// no_asistio se preserva en BD para compatibilidad pero no tiene botón visible en la UI
const ESTADOS_SESION = [
  { value: 'pendiente', label: 'Pendiente'  },
  { value: 'asistio',   label: 'Confirmada' },
  { value: 'cancelo',   label: 'Canceló'   },
]

const MODALIDAD_CONFIG: Record<AppointmentModalidad, {
  label: string
  color: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}> = {
  online:   { label: 'Online',   color: '#8FA5BD', Icon: Monitor },
  medellin: { label: 'Medellín', color: '#9488B0', Icon: MapPin  },
  retiro:   { label: 'Retiro',   color: '#7EA88F', Icon: Leaf    },
}

const ACTIVE_SESSION_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente:  { bg: 'var(--state-inactive-bg)',  color: 'var(--ink-cool)' },
  asistio:    { bg: 'var(--state-success-bg)',   color: 'var(--state-success-text)' },
  cancelo:    { bg: 'var(--state-cancel-bg)',    color: 'var(--state-cancel-text)' },
  no_asistio: { bg: 'var(--state-warning-bg)',   color: 'var(--state-warning-text)' },
}

const ACTIVE_PAYMENT_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente: { bg: 'var(--state-pending-bg)', color: 'var(--state-pending-text)' },
  pagado:    { bg: 'var(--state-success-bg)', color: 'var(--state-success-text)' },
}

const inactiveToggle = {
  background: 'rgba(255,255,255,0.42)',
  color: 'var(--ink-cool-muted)',
  border: '1px solid transparent',
}

export default function AppointmentModal({ appointment, onClose }: AppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [estadoSesion, setEstadoSesion] = useState(appointment.estado_sesion)
  const [estadoPago, setEstadoPago] = useState(appointment.estado_pago)
  const [modalidadEdit, setModalidadEdit] = useState<AppointmentModalidad | null>(appointment.modalidad)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fechaFormateada = new Date(appointment.fecha_inicio).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  async function guardarCambios() {
    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ estado_sesion: estadoSesion, estado_pago: estadoPago, modalidad: modalidadEdit })
        .eq('id', appointment.id)

      if (error) throw error

      router.refresh()
      onClose()
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div>
        <div className="flex items-start justify-between p-5">
          <div>
            <SectionHeader label="Detalle de cita" className="mb-2" />
            <h2 className="editorial-title text-[1.4rem]" style={{ color: 'var(--ink-cool-strong)' }}>
              {appointment.patient?.nombre} {appointment.patient?.apellido}
            </h2>
            <p className="text-sm mt-1 capitalize" style={{ color: 'var(--ink-cool-soft)' }}>{fechaFormateada}</p>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Cerrar" className="p-2.5">
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* ── Estado de sesión ── */}
          <div>
            <SectionHeader label="Estado de la sesión" className="mb-2.5" />
            <div className="grid grid-cols-3 gap-1.5">
              {ESTADOS_SESION.map(({ value, label }) => {
                const isActive = estadoSesion === value
                const s = isActive ? ACTIVE_SESSION_STYLES[value] : null
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoSesion(value as typeof estadoSesion)}
                    className="py-2.5 px-3 rounded-[14px] text-[13px] font-medium transition-all"
                    style={isActive ? {
                      background: s!.bg,
                      color: s!.color,
                      border: '1px solid rgba(255,255,255,0.14)',
                    } : inactiveToggle}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Modalidad ── */}
          <div>
            <SectionHeader label="Modalidad" className="mb-2.5" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(MODALIDAD_CONFIG) as [AppointmentModalidad, typeof MODALIDAD_CONFIG[AppointmentModalidad]][]).map(([value, { label, color, Icon }]) => {
                const isActive = modalidadEdit === value
                return (
                  <button
                    key={value}
                    onClick={() => setModalidadEdit(value)}
                    className="py-2.5 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5"
                    style={isActive ? {
                      background: `${color}22`,
                      color,
                      border: `1px solid ${color}44`,
                    } : inactiveToggle}
                  >
                    <Icon size={12} style={{ color: isActive ? color : undefined }} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Estado de pago ── */}
          <div>
            <SectionHeader label="Estado del pago" className="mb-2.5" />
            <div className="grid grid-cols-2 gap-1.5">
              {(['pendiente', 'pagado'] as const).map((value) => {
                const isActive = estadoPago === value
                const s = isActive ? ACTIVE_PAYMENT_STYLES[value] : null
                const label = value === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'
                return (
                  <button
                    key={value}
                    onClick={() => setEstadoPago(value)}
                    className="py-2.5 px-3 rounded-[14px] text-[13px] font-medium transition-all"
                    style={isActive ? {
                      background: s!.bg,
                      color: s!.color,
                      border: '1px solid rgba(255,255,255,0.14)',
                    } : inactiveToggle}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Acciones secundarias ── */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="subtle"
              onClick={() => router.push(`/pacientes/${appointment.patient_id}`)}
              className="flex-1 gap-2 py-3 text-[13px]"
            >
              <FileText size={15} />
              Historia clínica
            </Button>

            {appointment.patient?.whatsapp && (
              <a
                href={linkRecordatorioCita(appointment.patient, appointment)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-action flex-1 gap-2 py-3 text-[13px]"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            )}
          </div>

          {saveError && (
            <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {saveError}
            </p>
          )}

          {/* ── Acción principal ── */}
          <Button
            variant="action"
            onClick={guardarCambios}
            disabled={saving}
            className="w-full py-3 text-xs tracking-[0.06em] uppercase"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
