'use client'
// ============================================================
// APPOINTMENT MODAL — gestión completa de una cita
// Reagendar · Conflictos · Estados · Contexto · Deuda · Eliminar
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, MessageCircle, AlertTriangle, Trash2, CalendarDays, Clock3, ChevronDown, Tag, Type } from 'lucide-react'
import { Appointment, AppointmentModalidad } from '@/types'
import {
  APPOINTMENT_SESSION_LABEL,
  APPOINTMENT_SESSION_STATES,
} from '@/lib/appointment-status'
import {
  formatInBogota,
  toBogotaDateInputValue,
  toBogotaTimeInputValue,
} from '@/lib/datetime'
import { APPOINTMENT_MODALIDAD_CONFIG, GENERAL_EVENT_COLOR_PRESETS } from '@/lib/appointment-ui'
import {
  buildAppointmentDisplayTitle,
  buildLocalAppointmentStart,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  findAppointmentConflict,
  getAppointmentDurationOptions,
  getAppointmentEnd,
  getAppointmentEndFromDuration,
  getAppointmentScheduleError,
  isDoctoraliaAppointment,
} from '@/lib/appointments'
import { deleteAppointmentById, updateAppointmentById } from '@/lib/appointment-updates'
import { createClient } from '@/lib/supabase/client'
import { linkRecordatorioCita, resolveWhatsApp } from '@/lib/whatsapp'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'
import ModalShell from '@/components/ui/ModalShell'

interface AppointmentModalProps {
  appointment: Appointment
  appointments: Appointment[]
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

function toDateInputValue(isoString: string): string {
  return toBogotaDateInputValue(isoString)
}

function toTimeInputValue(isoString: string): string {
  return toBogotaTimeInputValue(isoString)
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

export default function AppointmentModal({ appointment, appointments, onClose }: AppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [estadoSesion, setEstadoSesion] = useState(appointment.estado_sesion)
  const [estadoPago, setEstadoPago] = useState(appointment.estado_pago)
  const [modalidadEdit, setModalidadEdit] = useState<AppointmentModalidad | null>(appointment.modalidad)
  const [title, setTitle] = useState(appointment.title ?? '')
  const [category, setCategory] = useState(appointment.category ?? '')
  const [color, setColor] = useState(appointment.color ?? null)
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
  const isDoctoraliaSource = isDoctoraliaAppointment(appointment)

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
    modalidadEdit !== appointment.modalidad ||
    title.trim() !== (appointment.title ?? '') ||
    category.trim() !== (appointment.category ?? '') ||
    color !== (appointment.color ?? null) ||
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
      const { error } = await updateAppointmentById(supabase, appointment.id, {
        estado_sesion: estadoSesion,
        estado_sesion_override: null,
        estado_pago:   estadoPago,
        modalidad:     modalidadEdit,
        title:         title.trim() || null,
        category:      category.trim() || null,
        color,
        fecha_inicio:  nuevaInicio.toISOString(),
        fecha_fin:     nuevaFin.toISOString(),
        notas:         notas.trim() || null,
      })

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
      if (appointment.doctoralia_uid) {
        const { error: importError } = await supabase
          .from('doctoralia_imports')
          .upsert({
            user_id: appointment.user_id,
            doctoralia_uid: appointment.doctoralia_uid,
            appointment_id: null,
            external_patient_name: appointment.doctoralia_paciente_nombre,
            last_seen_at: appointment.doctoralia_last_seen_at,
            deleted_in_lumi_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,doctoralia_uid',
            ignoreDuplicates: false,
          })

        if (importError) throw importError
      }

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
      <div className="overflow-y-auto max-h-[88vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-4">
          <div>
            <SectionHeader label="Detalle de cita" className="mb-1" />
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
                  {deudaCount} sesión{deudaCount > 1 ? 'es' : ''} sin pagar
                </span>
              )}
            </div>
            <p className="text-[12px] mt-0.5 capitalize" style={{ color: 'var(--ink-cool-soft)' }}>
              {fechaFormateada}
            </p>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Cerrar" className="p-2">
            <X size={16} />
          </Button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {/* ── Reagendar ── */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

          </div>

          {appointment.event_type === 'general' ? (
            <>
              <div>
                <SectionHeader label="Título" className="mb-2.5" />
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
                <SectionHeader label="Categoría" className="mb-2.5" />
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
                <SectionHeader label="Color" className="mb-2.5" />
                <div className="grid grid-cols-5 gap-1.5">
                  {GENERAL_EVENT_COLOR_PRESETS.map((preset) => {
                    const isActive = color === preset.value
                    return (
                      <button
                        key={preset.value}
                        onClick={() => setColor((current) => current === preset.value ? null : preset.value)}
                        className="py-2.5 px-3 rounded-[14px] text-[12px] font-medium transition-all flex items-center justify-center gap-1.5"
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
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <Type size={14} />
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="lumi-control-field w-full"
                    placeholder="Alias para esta cita (opcional)"
                  />
                </span>
              </div>

              <div>
                <SectionHeader label="Modalidad" className="mb-2.5" />
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(APPOINTMENT_MODALIDAD_CONFIG) as [AppointmentModalidad, typeof APPOINTMENT_MODALIDAD_CONFIG[AppointmentModalidad]][]).map(([value, { label, color, textColor, Icon }]) => {
                    const isActive = modalidadEdit === value
                    return (
                      <button
                        key={value}
                        onClick={() => setModalidadEdit(value)}
                        className="py-2.5 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5"
                        style={isActive ? {
                          background: `${color}22`,
                          color: textColor,
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
            </>
          )}

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
            {appointment.patient_id && appointment.event_type === 'patient' && (
              <Button
                variant="subtle"
                onClick={() => router.push(`/pacientes/${appointment.patient_id}`)}
                className="flex-1 gap-2 py-3 text-[13px]"
              >
                <FileText size={15} />
                Historia clínica
              </Button>
            )}

            {appointment.patient && resolveWhatsApp(appointment.patient) && appointment.event_type === 'patient' && (
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
            className="w-full py-2.5 text-[13px]"
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
