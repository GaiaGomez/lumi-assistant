'use client'
// ============================================================
// APPOINTMENT MODAL — gestión completa de una cita
// Reagendar · Conflictos · Estados · Contexto · Deuda · Eliminar
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, MessageCircle, AlertTriangle, Trash2, CalendarDays, Clock3, ChevronDown, MapPin, Tag, Type, NotebookPen } from 'lucide-react'
import { Appointment, Consultorio } from '@/types'
import {
  APPOINTMENT_SESSION_LABEL,
  APPOINTMENT_SESSION_STATES,
} from '@/lib/appointments/status'
import {
  formatInBogota,
  toBogotaDateInputValue,
  toBogotaTimeInputValue,
} from '@/lib/dates/datetime'
import {
  GENERAL_EVENT_COLOR_PRESETS,
} from '@/lib/appointments/ui'
import {
  resolveAppointmentConsultorioSelectionId,
  resolveConsultorioDisplayConfig,
} from '@/lib/consultorios'
import {
  buildAppointmentDisplayTitle,
  buildLocalAppointmentStart,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  findAppointmentConflict,
  getAppointmentDurationOptions,
  getAppointmentEnd,
  getAppointmentEndFromDuration,
  getAppointmentScheduleError,
} from '@/lib/appointments'
import { deleteAppointmentById, updateAppointmentById } from '@/lib/appointments/updates'
import { type SettingsMap } from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'
import { linkRecordatorioCita, resolveWhatsApp } from '@/lib/whatsapp'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'
import ModalShell from '@/components/ui/ModalShell'

interface AppointmentModalProps {
  appointment: Appointment
  appointments: Appointment[]
  consultorios: Consultorio[]
  settings: SettingsMap
  onClose: () => void
}

const ACTIVE_SESSION_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente:  { bg: 'var(--state-inactive-bg)',       color: 'var(--ink-cool-strong)' },
  confirmada: { bg: 'rgba(143,165,189,0.22)',         color: '#273847' },
  realizada:  { bg: 'var(--state-success-bg)',        color: '#284236' },
  cancelo:    { bg: 'var(--state-cancel-bg)',         color: '#5B353B' },
}

const ACTIVE_PAYMENT_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente: { bg: 'var(--state-pending-bg)', color: '#5D4535' },
  pagado:    { bg: 'var(--state-success-bg)', color: '#284236' },
}

const inactiveToggle = {
  background: 'rgba(255,255,255,0.42)',
  color: 'var(--ink-cool-strong)',
  border: '1px solid transparent',
}

function formatSchedule(date: Date): string {
  return formatInBogota(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeRange(start: Date, end: Date): string {
  return `${formatInBogota(start, { hour: '2-digit', minute: '2-digit' })} – ${formatInBogota(end, { hour: '2-digit', minute: '2-digit' })}`
}

function formatConflictDateTime(appointment: Appointment): string {
  const start = new Date(appointment.fecha_inicio)
  const end = getAppointmentEnd(appointment)
  return `${formatInBogota(start, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${formatTimeRange(start, end)}`
}

export default function AppointmentModal({
  appointment,
  appointments,
  consultorios,
  settings,
  onClose,
}: AppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [estadoSesion, setEstadoSesion] = useState(appointment.estado_sesion)
  const [estadoPago, setEstadoPago] = useState(appointment.estado_pago)
  const [consultorioIdEdit, setConsultorioIdEdit] = useState<string | null>(
    resolveAppointmentConsultorioSelectionId(appointment, consultorios)
  )
  const [title, setTitle] = useState(appointment.title ?? '')
  const [category, setCategory] = useState(appointment.category ?? '')
  const [color, setColor] = useState(appointment.color ?? null)
  const initialDuration = Math.max(
    15,
    Math.round((getAppointmentEnd(appointment).getTime() - new Date(appointment.fecha_inicio).getTime()) / 60000)
  )
  const [fechaValue, setFechaValue] = useState(toBogotaDateInputValue(appointment.fecha_inicio))
  const [horaInicioValue, setHoraInicioValue] = useState(toBogotaTimeInputValue(appointment.fecha_inicio))
  const [duracion, setDuracion] = useState(initialDuration || DEFAULT_APPOINTMENT_DURATION_MINUTES)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deudaCount, setDeudaCount] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [existingNote, setExistingNote] = useState<{
    id: string
    isDraft: boolean
    signedAt: string | null
  } | null | 'loading'>('loading')
  const selectedConsultorio = consultorios.find((consultorio) => consultorio.id === consultorioIdEdit) ?? null
  useEffect(() => {
    if (appointment.event_type !== 'patient') {
      setExistingNote(null)
      return
    }
    supabase
      .from('session_notes')
      .select('id, is_draft, signed_at')
      .eq('appointment_id', appointment.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingNote({
            id: data.id as string,
            isDraft: data.is_draft as boolean,
            signedAt: data.signed_at as string | null,
          })
        } else {
          setExistingNote(null)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id])

  // Deuda del paciente — sesiones realizadas sin pagar (excluye la cita actual)
  useEffect(() => {
    async function loadDeuda() {
      if (!appointment.patient_id) {
        setDeudaCount(null)
        return
      }
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

  const scheduleErrorBase = getAppointmentScheduleError(nuevaInicio, nuevaFin, duracion)
  const scheduleError = scheduleErrorBase === 'Completa fecha y hora.'
    ? 'Completa fecha y hora de inicio.'
    : scheduleErrorBase

  const conflicto = !scheduleError && nuevaInicio && nuevaFin
    ? findAppointmentConflict(appointments, nuevaInicio, nuevaFin, appointment.id)
    : undefined

  const hasChanges =
    estadoSesion !== appointment.estado_sesion ||
    estadoPago !== appointment.estado_pago ||
    consultorioIdEdit !== resolveAppointmentConsultorioSelectionId(appointment, consultorios) ||
    title.trim() !== (appointment.title ?? '') ||
    category.trim() !== (appointment.category ?? '') ||
    color !== (appointment.color ?? null) ||
    (nuevaInicio?.toISOString() ?? '') !== currentStart.toISOString() ||
    (nuevaFin?.toISOString() ?? '') !== currentEnd.toISOString()

  const isSaveBlocked = saving || !hasChanges || !!scheduleError || !!conflicto

  const fechaFormateada = formatSchedule(currentStart)

  async function guardarCambios() {
    if (!nuevaInicio || !nuevaFin || scheduleError || conflicto) return

    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await updateAppointmentById(supabase, appointment.id, {
        estado_sesion: estadoSesion,
        estado_pago:   estadoPago,
        consultorio_id: consultorioIdEdit,
        modalidad:     consultorioIdEdit ? null : appointment.modalidad,
        title:         title.trim() || null,
        category:      category.trim() || null,
        color,
        fecha_inicio:  nuevaInicio.toISOString(),
        fecha_fin:     nuevaFin.toISOString(),
      })

      if (error) throw error
      router.refresh()
      onClose()
    } catch {
      setSaveError('Error al guardar. Intenta otra vez.')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarCita() {
    setDeleting(true)
    try {
      const { error } = await deleteAppointmentById(supabase, appointment.id)
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
      <div>

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-3.5 pt-3 pb-2">
          <div>
            <SectionHeader label="Cita" className="mb-1" />
            <div className="flex items-center gap-2 flex-wrap">
              {appointment.patient_id ? (
                <button
                  type="button"
                  onClick={() => router.push(`/pacientes/${appointment.patient_id}`)}
                  className="editorial-panel-title text-[1.05rem] transition-opacity"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.78' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  {appointment.patient?.nombre} {appointment.patient?.apellido}
                </button>
              ) : (
                <h2 className="editorial-panel-title text-[1.05rem]">
                  {buildAppointmentDisplayTitle(appointment)}
                </h2>
              )}
              {deudaCount !== null && deudaCount > 0 && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--state-warning-bg)', color: 'var(--state-warning-text)' }}
                >
                  {deudaCount} cita{deudaCount > 1 ? 's' : ''} sin cobrar
                </span>
              )}
            </div>
            <p className="text-[13px] mt-0.5 capitalize" style={{ color: 'var(--ink-cool-soft)' }}>
              {fechaFormateada}
            </p>
          </div>
          <Button
            variant="subtle"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="px-3.5 pb-3 space-y-2.5">
          {/* ── Reagendar ── */}
          <div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="section-kicker">
                  Fecha
                </span>
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <CalendarDays size={14} />
                  </span>
                  <input
                    type="date"
                    value={fechaValue}
                    onChange={(e) => setFechaValue(e.target.value)}
                    className="lumi-control-field lumi-control-field--date w-full"
                  />
                </span>
              </label>
              <label className="space-y-1">
                <span className="section-kicker">
                  Inicio
                </span>
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <Clock3 size={14} />
                  </span>
                  <input
                    type="time"
                    value={horaInicioValue}
                    onChange={(e) => setHoraInicioValue(e.target.value)}
                    className="lumi-control-field lumi-control-field--time w-full"
                  />
                </span>
              </label>
              <label className="space-y-1">
                <span className="section-kicker">
                  Duración
                </span>
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <Clock3 size={14} />
                  </span>
                  <span className="lumi-control-affordance" aria-hidden="true">
                    <ChevronDown size={14} />
                  </span>
                  <select
                    value={duracion}
                    onChange={(e) => setDuracion(Number(e.target.value))}
                    className="lumi-control-field lumi-control-field--select w-full"
                  >
                    {durationOptions.map((value) => (
                      <option key={value} value={value}>
                        {value < 60 ? `${value} min` : value % 60 === 0 ? `${value / 60} hora${value === 60 ? '' : 's'}` : `${Math.floor(value / 60)}h ${value % 60}min`}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>

            {scheduleError && (
              <div
                className="mt-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px]"
                style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
              >
                <AlertTriangle size={13} />
                {scheduleError}
              </div>
            )}

            {conflicto && nuevaInicio && nuevaFin && (
              <div
                className="mt-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px]"
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

          </div>

          {appointment.event_type === 'general' ? (
            <>
              <div>
                <SectionHeader label="Título" className="mb-2" />
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <Type size={14} />
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="lumi-control-field w-full"
                    placeholder="Nombre del evento"
                  />
                </span>
              </div>
              <div>
                <SectionHeader label="Categoría" className="mb-2" />
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <Tag size={14} />
                  </span>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="lumi-control-field w-full"
                    placeholder="Categoría opcional"
                  />
                </span>
              </div>
              <div>
                <SectionHeader label="Color" className="mb-2" />
                <div className="grid grid-cols-5 gap-1.5">
                  {GENERAL_EVENT_COLOR_PRESETS.map((preset) => {
                    const isActive = color === preset.value
                    return (
                      <button
                        key={preset.value}
                        onClick={() => setColor((current) => current === preset.value ? null : preset.value)}
                        className="py-2.5 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5"
                        style={isActive ? {
                          background: `${preset.value}22`,
                          color: preset.textColor,
                          border: `1px solid ${preset.value}44`,
                        } : inactiveToggle}
                      >
                        <preset.Icon size={12} style={{ color: isActive ? preset.value : undefined }} />
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <SectionHeader label="Consultorio" className="mb-2" />
                {consultorios.length > 0 ? (
                  <div className="space-y-2">
                    <span className="lumi-control-shell">
                      <span className="lumi-control-icon" aria-hidden="true">
                        {selectedConsultorio ? (
                          (() => {
                            const { Icon } = resolveConsultorioDisplayConfig(selectedConsultorio)
                            return <Icon size={14} />
                          })()
                        ) : (
                          <MapPin size={14} />
                        )}
                      </span>
                      <span className="lumi-control-affordance" aria-hidden="true">
                        <ChevronDown size={14} />
                      </span>
                      <select
                        value={consultorioIdEdit ?? ''}
                        onChange={(event) => setConsultorioIdEdit(event.target.value || null)}
                        className="lumi-control-field lumi-control-field--select w-full"
                      >
                        {consultorios.map((consultorio) => (
                          <option key={consultorio.id} value={consultorio.id}>
                            {consultorio.nombre}
                          </option>
                        ))}
                      </select>
                    </span>

                    {selectedConsultorio && (() => {
                      const display = resolveConsultorioDisplayConfig(selectedConsultorio)
                      return display.primaryValue ? (
                        <p className="text-[12px] leading-snug" style={{ color: 'var(--ink-cool-faint)' }}>
                          {display.primaryValue}
                        </p>
                      ) : null
                    })()}
                  </div>
                ) : (
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--ink-cool-faint)' }}>
                    Esta cita no tiene un consultorio disponible en tu configuración actual.
                  </p>
                )}
              </div>

              <div>
                <SectionHeader label="Estado" className="mb-2" />
                <div className="grid grid-cols-2 gap-1.5">
                  {APPOINTMENT_SESSION_STATES.map((value) => {
                    const isActive = estadoSesion === value
                    const s = isActive ? ACTIVE_SESSION_STYLES[value] : null
                    return (
                      <button
                        key={value}
                        onClick={() => setEstadoSesion(value as typeof estadoSesion)}
                        className="py-2 px-3 rounded-[14px] text-[13px] font-medium transition-all"
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

              <div>
                <SectionHeader label="Estado del pago" className="mb-2" />
                <div className="grid grid-cols-2 gap-1.5">
                  {(['pendiente', 'pagado'] as const).map((value) => {
                    const isActive = estadoPago === value
                    const s = isActive ? ACTIVE_PAYMENT_STYLES[value] : null
                    const label = value === 'pagado' ? '✓ Cobrada' : '⏳ Sin cobrar'
                    return (
                      <button
                        key={value}
                        onClick={() => setEstadoPago(value)}
                        className="py-2 px-3 rounded-[14px] text-[13px] font-medium transition-all"
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
            </>
          )}

          {/* ── Acciones secundarias ── */}
          <div className="flex gap-2">
            {appointment.event_type === 'patient' && existingNote !== 'loading' && (
              <Button
                variant="subtle"
                onClick={() => router.push(`/citas/${appointment.id}`)}
                className="flex-1 gap-1.5 px-3 py-1.5 text-[12px]"
              >
                <NotebookPen size={12} />
                {existingNote ? 'Ver nota' : 'Nueva nota'}
              </Button>
            )}

            {appointment.patient && resolveWhatsApp(appointment.patient) && appointment.event_type === 'patient' && (
              <a
                href={linkRecordatorioCita(appointment.patient, appointment, settings)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-action flex-1 gap-1.5 px-3 py-1.5 text-[12px]"
              >
                <MessageCircle size={12} />
                WhatsApp
              </a>
            )}
          </div>

          {saveError && (
            <p className="text-[13px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {saveError}
            </p>
          )}

          {/* ── Guardar ── */}
          <Button
            variant="action"
            onClick={guardarCambios}
            disabled={isSaveBlocked}
            className="w-full py-1.5 text-[12px]"
          >
            {saving ? 'Guardando…' : conflicto ? 'Corrige el conflicto para guardar' : 'Guardar'}
          </Button>

          {/* ── Eliminar — dos pasos ── */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 py-1.5 text-center text-[12px] transition-all"
              style={{ color: 'var(--ink-cool-faint)' }}
            >
              <Trash2 size={11} />
              Eliminar cita
            </button>
          ) : (
            <div
              className="space-y-1.5 rounded-[14px] p-2.5"
              style={{ background: 'var(--state-cancel-bg)' }}
            >
              <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
                ¿Eliminar? No se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-[10px] py-1.5 text-[12px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ink-cool)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarCita}
                  disabled={deleting}
                  className="flex-1 rounded-[10px] py-1.5 text-[12px] font-medium"
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
