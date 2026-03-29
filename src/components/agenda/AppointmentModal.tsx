'use client'
// ============================================================
// APPOINTMENT MODAL — gestión completa de una cita
// Reagendar · Conflictos · Estados · Contexto · Deuda · Eliminar
// ============================================================

import { useState, useEffect } from 'react'
import type React from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, MessageCircle, Monitor, MapPin, Leaf, AlertTriangle, Trash2 } from 'lucide-react'
import { Appointment, AppointmentModalidad } from '@/types'
import {
  APPOINTMENT_SESSION_LABEL,
  APPOINTMENT_SESSION_STATES,
} from '@/lib/appointment-status'
import {
  buildLocalAppointmentStart,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  findAppointmentConflict,
  getAppointmentDurationOptions,
  getAppointmentEnd,
  getAppointmentEndFromDuration,
} from '@/lib/appointments'
import { createClient } from '@/lib/supabase/client'
import { linkRecordatorioCita } from '@/lib/whatsapp'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'
import ModalShell from '@/components/ui/ModalShell'

interface AppointmentModalProps {
  appointment: Appointment
  appointments: Appointment[]
  onClose: () => void
}

const MODALIDAD_CONFIG: Record<AppointmentModalidad, {
  label: string
  color: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}> = {
  online:   {
    label: 'Online',   color: '#8FA5BD', Icon: Monitor,
  },
  medellin: {
    label: 'Medellín', color: '#9488B0', Icon: MapPin,
  },
  retiro:   {
    label: 'Retiro',   color: '#7EA88F', Icon: Leaf,
  },
}

const ACTIVE_SESSION_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente:  { bg: 'var(--state-inactive-bg)',       color: 'var(--ink-cool)' },
  confirmada: { bg: 'rgba(143,165,189,0.22)',         color: '#3d6b8a' },
  realizada:  { bg: 'var(--state-success-bg)',        color: 'var(--state-success-text)' },
  cancelo:    { bg: 'var(--state-cancel-bg)',         color: 'var(--state-cancel-text)' },
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

function toDateInputValue(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toTimeInputValue(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatSchedule(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeRange(start: Date, end: Date): string {
  return `${start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

function formatConflictDateTime(appointment: Appointment): string {
  const start = new Date(appointment.fecha_inicio)
  const end = getAppointmentEnd(appointment)
  return `${start.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${formatTimeRange(start, end)}`
}

export default function AppointmentModal({ appointment, appointments, onClose }: AppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [estadoSesion, setEstadoSesion] = useState(appointment.estado_sesion)
  const [estadoPago, setEstadoPago] = useState(appointment.estado_pago)
  const [modalidadEdit, setModalidadEdit] = useState<AppointmentModalidad | null>(appointment.modalidad)
  const initialDuration = Math.max(
    15,
    Math.round((getAppointmentEnd(appointment).getTime() - new Date(appointment.fecha_inicio).getTime()) / 60000)
  )
  const [fechaValue, setFechaValue] = useState(toDateInputValue(appointment.fecha_inicio))
  const [horaInicioValue, setHoraInicioValue] = useState(toTimeInputValue(appointment.fecha_inicio))
  const [duracion, setDuracion] = useState(initialDuration || DEFAULT_APPOINTMENT_DURATION_MINUTES)
  const [notas, setNotas] = useState(appointment.notas ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deudaCount, setDeudaCount] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Deuda del paciente — sesiones realizadas sin pagar (excluye la cita actual)
  useEffect(() => {
    async function loadDeuda() {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', appointment.patient_id)
        .eq('estado_pago', 'pendiente')
        .eq('estado_sesion', 'realizada')
        .neq('id', appointment.id)
      setDeudaCount(count ?? 0)
    }
    loadDeuda()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.patient_id, appointment.id])

  const currentStart = new Date(appointment.fecha_inicio)
  const currentEnd = getAppointmentEnd(appointment)
  const nuevaInicio = buildLocalAppointmentStart(fechaValue, horaInicioValue)
  const nuevaFin = nuevaInicio
    ? getAppointmentEndFromDuration(nuevaInicio, duracion)
    : null

  let scheduleError: string | null = null
  if (!nuevaInicio || !nuevaFin) {
    scheduleError = 'Completa fecha y hora de inicio.'
  } else if (duracion < 15) {
    scheduleError = 'La duración mínima es de 15 minutos.'
  }

  const conflicto = !scheduleError && nuevaInicio && nuevaFin
    ? findAppointmentConflict(appointments, nuevaInicio, nuevaFin, appointment.id)
    : undefined

  const hasChanges =
    estadoSesion !== appointment.estado_sesion ||
    estadoPago !== appointment.estado_pago ||
    modalidadEdit !== appointment.modalidad ||
    (nuevaInicio?.toISOString() ?? '') !== currentStart.toISOString() ||
    (nuevaFin?.toISOString() ?? '') !== currentEnd.toISOString() ||
    (notas.trim() || '') !== (appointment.notas ?? '')

  const isSaveBlocked = saving || !hasChanges || !!scheduleError || !!conflicto

  const fechaFormateada = formatSchedule(currentStart)

  async function guardarCambios() {
    if (!nuevaInicio || !nuevaFin || scheduleError || conflicto) return

    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          estado_sesion: estadoSesion,
          estado_pago:   estadoPago,
          modalidad:     modalidadEdit,
          fecha_inicio:  nuevaInicio.toISOString(),
          fecha_fin:     nuevaFin.toISOString(),
          notas:         notas.trim() || null,
        })
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

  async function eliminarCita() {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id)
      if (error) throw error
      router.refresh()
      onClose()
    } catch {
      setSaveError('No se pudo eliminar. Intenta de nuevo.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const durationOptions = getAppointmentDurationOptions(duracion)

  return (
    <ModalShell onClose={onClose}>
      <div className="overflow-y-auto max-h-[88vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5">
          <div>
            <SectionHeader label="Detalle de cita" className="mb-2" />
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="editorial-title text-[1.4rem]" style={{ color: 'var(--ink-cool-strong)' }}>
                {appointment.patient?.nombre} {appointment.patient?.apellido}
              </h2>
              {deudaCount !== null && deudaCount > 0 && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--state-warning-bg)', color: 'var(--state-warning-text)' }}
                >
                  {deudaCount} sesión{deudaCount > 1 ? 'es' : ''} sin pagar
                </span>
              )}
            </div>
            <p className="text-sm mt-1 capitalize" style={{ color: 'var(--ink-cool-soft)' }}>
              {fechaFormateada}
            </p>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Cerrar" className="p-2.5">
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 pb-5 space-y-4">

          {/* ── Reagendar ── */}
          <div>
            <SectionHeader label="Reagendar" className="mb-2.5" />
            <div
              className="rounded-[14px] p-3 mb-2.5"
              style={{ background: 'rgba(255,255,255,0.34)', border: '1px solid var(--border-glass-white)' }}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--ink-cool-faint)' }}>
                Horario actual
              </p>
              <p className="text-[13px] font-medium capitalize" style={{ color: 'var(--ink-cool-strong)' }}>
                {formatSchedule(currentStart)}
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--ink-cool-soft)' }}>
                {formatTimeRange(currentStart, currentEnd)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Fecha
                </span>
                <input
                  type="date"
                  value={fechaValue}
                  onChange={(e) => setFechaValue(e.target.value)}
                  className="rounded-[12px] px-3 py-2.5 text-[13px] w-full"
                  style={{
                    background: 'rgba(255,255,255,0.52)',
                    border: '1px solid var(--border-glass-white)',
                    color: 'var(--ink-cool-strong)',
                    outline: 'none',
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Inicio
                </span>
                <input
                  type="time"
                  value={horaInicioValue}
                  onChange={(e) => setHoraInicioValue(e.target.value)}
                  className="rounded-[12px] px-3 py-2.5 text-[13px] w-full"
                  style={{
                    background: 'rgba(255,255,255,0.52)',
                    border: '1px solid var(--border-glass-white)',
                    color: 'var(--ink-cool-strong)',
                    outline: 'none',
                  }}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Duración
                </span>
                <select
                  value={duracion}
                  onChange={(e) => setDuracion(Number(e.target.value))}
                  className="rounded-[12px] px-3 py-2.5 text-[13px] w-full"
                  style={{
                    background: 'rgba(255,255,255,0.52)',
                    border: '1px solid var(--border-glass-white)',
                    color: 'var(--ink-cool-strong)',
                    outline: 'none',
                  }}
                >
                  {durationOptions.map((value) => (
                    <option key={value} value={value}>
                      {value < 60 ? `${value} min` : value % 60 === 0 ? `${value / 60} hora${value === 60 ? '' : 's'}` : `${Math.floor(value / 60)}h ${value % 60}min`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {nuevaInicio && nuevaFin && !scheduleError && (
              <div
                className="mt-2 rounded-[10px] px-3 py-2"
                style={{ background: 'rgba(143,165,189,0.10)', border: '1px solid rgba(143,165,189,0.16)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Nuevo horario
                </p>
                <p className="text-[13px] font-medium capitalize mt-1" style={{ color: 'var(--ink-cool-strong)' }}>
                  {formatSchedule(nuevaInicio)}
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--ink-cool-soft)' }}>
                  {formatTimeRange(nuevaInicio, nuevaFin)}
                  {` · ${duracion} min`}
                </p>
              </div>
            )}

            {scheduleError && (
              <div
                className="mt-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px]"
                style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
              >
                <AlertTriangle size={13} />
                {scheduleError}
              </div>
            )}

            {conflicto && nuevaInicio && nuevaFin && (
              <div
                className="mt-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px]"
                style={{ background: 'var(--state-warning-bg)', color: 'var(--state-warning-text)' }}
              >
                <AlertTriangle size={13} />
                <span>
                  Conflicto con {conflicto.patient?.nombre} {conflicto.patient?.apellido}
                  {' · '}
                  {formatConflictDateTime(conflicto)}
                  {' · '}Corrige el horario para poder guardar.
                </span>
              </div>
            )}

            {!hasChanges && (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--ink-cool-faint)' }}>
                No hay cambios pendientes en esta cita.
              </p>
            )}
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

          {/* ── Estado de sesión — 2×2 ── */}
          <div>
            <SectionHeader label="Estado de la sesión" className="mb-2.5" />
            <div className="grid grid-cols-2 gap-1.5">
              {APPOINTMENT_SESSION_STATES.map((value) => {
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
                    {APPOINTMENT_SESSION_LABEL[value]}
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

          {/* ── Notas ── */}
          <div>
            <SectionHeader label="Notas" className="mb-2.5" />
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, contexto…"
              rows={2}
              className="w-full rounded-[12px] px-3 py-2.5 text-[13px] resize-none"
              style={{
                background: 'rgba(255,255,255,0.52)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-strong)',
                outline: 'none',
              }}
            />
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

          {/* ── Guardar ── */}
          <Button
            variant="action"
            onClick={guardarCambios}
            disabled={isSaveBlocked}
            className="w-full py-3 text-xs tracking-[0.06em] uppercase"
          >
            {saving ? 'Guardando…' : conflicto ? 'Corrige el conflicto para guardar' : 'Guardar cambios'}
          </Button>

          {/* ── Eliminar — dos pasos ── */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-center text-[12px] py-2 transition-all flex items-center justify-center gap-1"
              style={{ color: 'var(--ink-cool-faint)' }}
            >
              <Trash2 size={11} />
              Eliminar cita
            </button>
          ) : (
            <div
              className="rounded-[14px] p-3 space-y-2"
              style={{ background: 'var(--state-cancel-bg)' }}
            >
              <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
                ¿Segura? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-[10px] text-[12px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ink-cool)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarCita}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-[10px] text-[12px] font-medium"
                  style={{ background: 'var(--state-cancel-text)', color: 'white' }}
                >
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </ModalShell>
  )
}
