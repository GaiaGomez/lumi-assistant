'use client'

import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Clock3,
  Plus,
  Repeat2,
  Tag,
  Type,
  UserRound,
  X,
} from 'lucide-react'
import type {
  Appointment,
  AppointmentEventType,
  AppointmentModalidad,
  AppointmentRecurrencePreset,
  AppointmentRecurrenceRule,
  AppointmentRecurrenceUnit,
  AppointmentWeekday,
  Patient,
} from '@/types'
import {
  buildLocalAppointmentStart,
  buildRecurringAppointmentWindows,
  buildAppointmentDisplayTitle,
  findAppointmentConflict,
  getAppointmentScheduleError,
} from '@/lib/appointments'
import { createAppointments } from '@/lib/appointment-updates'
import { APPOINTMENT_MODALIDAD_CONFIG, GENERAL_EVENT_COLOR_PRESETS } from '@/lib/appointment-ui'
import { mapPatientRows } from '@/lib/supabase/mappers'
import { createClient } from '@/lib/supabase/client'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'

interface NewAppointmentModalProps {
  appointments: Appointment[]
  defaultStart: Date
  onClose: () => void
}

const WEEKDAY_OPTIONS: Array<{ value: AppointmentWeekday; label: string }> = [
  { value: 'mo', label: 'L' },
  { value: 'tu', label: 'M' },
  { value: 'we', label: 'X' },
  { value: 'th', label: 'J' },
  { value: 'fr', label: 'V' },
  { value: 'sa', label: 'S' },
  { value: 'su', label: 'D' },
]

const RECURRENCE_OPTIONS: Array<{ value: AppointmentRecurrencePreset; label: string }> = [
  { value: 'none', label: 'No repetir' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekdays', label: 'Lunes a viernes' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'selected-weekdays', label: 'Dias seleccionados' },
  { value: 'every-2-weeks', label: 'Cada 2 semanas' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizado' },
]

const CUSTOM_UNIT_OPTIONS: Array<{ value: AppointmentRecurrenceUnit; label: string }> = [
  { value: 'day', label: 'dias' },
  { value: 'week', label: 'semanas' },
  { value: 'month', label: 'meses' },
]

const inactiveToggle = {
  background: 'rgba(255,255,255,0.42)',
  color: 'var(--ink-cool-muted)',
  border: '1px solid transparent',
}

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function toTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

function formatTimeRange(start: Date, end: Date): string {
  return `${start.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

function formatConflictDateTime(appointment: Appointment): string {
  const start = new Date(appointment.fecha_inicio)
  const end = appointment.fecha_fin ? new Date(appointment.fecha_fin) : addMinutes(start, 60)
  return `${start.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${formatTimeRange(start, end)}`
}

function formatDateTimeRange(start: Date, end: Date): string {
  return `${start.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${formatTimeRange(start, end)}`
}

function formatOccurrenceCount(count: number): string {
  return `${count} evento${count === 1 ? '' : 's'}`
}

function getWeekdayFromDate(date: Date): AppointmentWeekday {
  return (['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'][date.getDay()] ?? 'mo') as AppointmentWeekday
}

export default function NewAppointmentModal({ appointments, defaultStart, onClose }: NewAppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const defaultEnd = addMinutes(defaultStart, 60)

  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [eventType, setEventType] = useState<AppointmentEventType>('patient')
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [fechaValue, setFechaValue] = useState(toDateInputValue(defaultStart))
  const [horaInicioValue, setHoraInicioValue] = useState(toTimeInputValue(defaultStart))
  const [horaFinValue, setHoraFinValue] = useState(toTimeInputValue(defaultEnd))
  const [modalidad, setModalidad] = useState<AppointmentModalidad>('online')
  const [recurrencePreset, setRecurrencePreset] = useState<AppointmentRecurrencePreset>('none')
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState<AppointmentWeekday[]>([getWeekdayFromDate(defaultStart)])
  const [customInterval, setCustomInterval] = useState('2')
  const [customUnit, setCustomUnit] = useState<AppointmentRecurrenceUnit>('week')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('patients')
      .select('*')
      .order('nombre', { ascending: true })
      .then(({ data }) => {
        setPatients(mapPatientRows(data))
        setLoadingPatients(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPatients = search
    ? patients.filter((patient) =>
        `${patient.nombre} ${patient.apellido}`.toLowerCase().includes(search.toLowerCase())
      )
    : patients

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearch('')
    setShowDropdown(false)
  }

  function toggleWeekday(weekday: AppointmentWeekday) {
    setSelectedWeekdays((current) => (
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday]
    ))
  }

  const startDate = buildLocalAppointmentStart(fechaValue, horaInicioValue)
  const endDate = buildLocalAppointmentStart(fechaValue, horaFinValue)
  const durationMinutes = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    : 0

  const scheduleErrorBase = getAppointmentScheduleError(startDate, endDate, durationMinutes)
  const scheduleError = scheduleErrorBase === 'Completa fecha y hora.'
    ? 'Completa fecha y hora.'
    : scheduleErrorBase

  const recurrenceRule: AppointmentRecurrenceRule | null = useMemo(() => {
    if (recurrencePreset === 'none') return null

    const base: AppointmentRecurrenceRule = {
      preset: recurrencePreset,
      untilDate: recurrenceUntilDate || null,
    }

    if (recurrencePreset === 'selected-weekdays') {
      return {
        ...base,
        weekdays: selectedWeekdays,
      }
    }

    if (recurrencePreset === 'custom') {
      return {
        ...base,
        interval: Math.max(1, Number(customInterval) || 1),
        unit: customUnit,
        weekdays: customUnit === 'week' ? selectedWeekdays : null,
      }
    }

    return base
  }, [customInterval, customUnit, recurrencePreset, recurrenceUntilDate, selectedWeekdays])

  const recurrenceError = useMemo(() => {
    if (recurrencePreset === 'none') return null
    if (!recurrenceUntilDate) return 'Define hasta cuándo se repite.'
    if (recurrenceUntilDate < fechaValue) return 'La recurrencia debe terminar después de la fecha inicial.'
    if (recurrencePreset === 'selected-weekdays' && selectedWeekdays.length === 0) {
      return 'Selecciona al menos un día.'
    }
    if (recurrencePreset === 'custom' && (Number(customInterval) || 0) < 1) {
      return 'El intervalo personalizado debe ser mayor que cero.'
    }
    if (recurrencePreset === 'custom' && customUnit === 'week' && selectedWeekdays.length === 0) {
      return 'Selecciona al menos un día para la repetición semanal.'
    }
    return null
  }, [customInterval, customUnit, fechaValue, recurrencePreset, recurrenceUntilDate, selectedWeekdays])

  const occurrences = useMemo(() => {
    if (!startDate || !endDate || scheduleError || recurrenceError) return []
    return buildRecurringAppointmentWindows({
      start: startDate,
      end: endDate,
      recurrence: recurrenceRule,
    })
  }, [endDate, recurrenceError, recurrenceRule, scheduleError, startDate])

  const conflict = useMemo(() => {
    if (occurrences.length === 0) return undefined

    return occurrences
      .map((occurrence) => findAppointmentConflict(appointments, occurrence.start, occurrence.end))
      .find(Boolean)
  }, [appointments, occurrences])

  const titleError = eventType === 'general' && !title.trim()
    ? 'Escribe un titulo para el evento.'
    : null

  const patientError = eventType === 'patient' && !selectedPatient
    ? 'Selecciona un paciente.'
    : null

  const isSaveBlocked = saving || !!scheduleError || !!recurrenceError || !!conflict || !!titleError || !!patientError || occurrences.length === 0

  async function handleSave() {
    if (!startDate || !endDate || scheduleError || recurrenceError || conflict) return
    if (eventType === 'patient' && !selectedPatient) {
      setError('Selecciona un paciente.')
      return
    }
    if (eventType === 'general' && !title.trim()) {
      setError('Escribe un titulo para el evento.')
      return
    }

    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión expirada')
      setSaving(false)
      return
    }

    const recurrenceGroupId = recurrenceRule ? crypto.randomUUID() : null

    const payload = occurrences.map((occurrence) => ({
      patient_id: eventType === 'patient' ? selectedPatient?.id ?? null : null,
      user_id: user.id,
      event_type: eventType,
      title: title.trim() || null,
      category: eventType === 'general' ? category.trim() || null : null,
      color: eventType === 'general' ? color : null,
      recurrence_group_id: recurrenceGroupId,
      recurrence_rule: recurrenceRule,
      fecha_inicio: occurrence.start.toISOString(),
      fecha_fin: occurrence.end.toISOString(),
      modalidad: eventType === 'patient' ? modalidad : null,
      notas,
    }))

    const { error: insertError } = await createAppointments(supabase, payload)
    if (insertError) {
      setError('No se pudo guardar. Intenta de nuevo.')
      setSaving(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <ModalShell onClose={onClose}>
      <div>
        <div className="flex items-start justify-between p-5 pb-4">
          <div>
            <SectionHeader label="Nuevo evento" className="mb-2" />
            <h2 className="editorial-title text-[1.3rem]" style={{ color: 'var(--ink-cool-strong)' }}>
              Crear en agenda
            </h2>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Cerrar" className="p-2.5">
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <SectionHeader label="Tipo de evento" className="mb-2" />
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'patient' as const, label: 'Cita con paciente' },
                { value: 'general' as const, label: 'Evento general' },
              ].map((option) => {
                const active = eventType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEventType(option.value)}
                    className="rounded-[14px] px-3 py-3 text-[13px] font-medium transition-all"
                    style={active ? {
                      background: 'rgba(200, 188, 205, 0.30)',
                      color: 'var(--ink-cool-strong)',
                      border: '1px solid var(--border-glass-muted)',
                    } : inactiveToggle}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {eventType === 'patient' ? (
            <div>
              <SectionHeader label="Paciente" className="mb-2" />
              {selectedPatient ? (
                <div className="lumi-control-shell">
                  <div className="lumi-control-field flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="lumi-control-icon" aria-hidden="true" style={{ position: 'static', transform: 'none' }}>
                        <UserRound size={14} />
                      </span>
                      <span className="text-[13px] truncate" style={{ color: 'var(--ink-cool-strong)' }}>
                        {selectedPatient.nombre} {selectedPatient.apellido}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-[11px] ml-2 shrink-0"
                      style={{ color: 'var(--ink-cool-muted)' }}
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <span className="lumi-control-shell">
                    <span className="lumi-control-icon" aria-hidden="true">
                      <UserRound size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder={loadingPatients ? 'Cargando pacientes…' : 'Buscar paciente…'}
                      value={search}
                      onChange={(event) => { setSearch(event.target.value); setShowDropdown(true) }}
                      onFocus={() => setShowDropdown(true)}
                      className="lumi-control-field w-full"
                      disabled={loadingPatients}
                      autoComplete="off"
                    />
                  </span>
                  {showDropdown && search && (
                    <div
                      className="absolute left-0 right-0 z-10 mt-1 rounded-[14px] overflow-hidden"
                      style={{ background: 'rgba(255,250,247,0.98)', border: '1px solid var(--border-glass-white)', boxShadow: 'var(--shadow-float)', maxHeight: '180px', overflowY: 'auto' }}
                    >
                      {filteredPatients.length === 0 ? (
                        <p className="px-3.5 py-3 text-[12px]" style={{ color: 'var(--ink-cool-muted)' }}>
                          Sin resultados
                        </p>
                      ) : (
                        filteredPatients.slice(0, 8).map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onMouseDown={() => selectPatient(patient)}
                            className="w-full text-left px-3.5 py-2.5 text-[13px] transition-colors"
                            style={{ color: 'var(--ink-strong)' }}
                            onMouseEnter={(event) => (event.currentTarget.style.background = 'rgba(148,136,176,0.10)')}
                            onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                          >
                            {patient.nombre} {patient.apellido}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <SectionHeader label="Titulo" className="mb-2" />
              <span className="lumi-control-shell">
                <span className="lumi-control-icon" aria-hidden="true">
                  <Type size={14} />
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Almuerzo, Grupo DBT, Reunión…"
                  className="lumi-control-field w-full"
                />
              </span>
            </div>
          )}

          {eventType === 'patient' && (
            <div>
              <SectionHeader label="Titulo (opcional)" className="mb-2" />
              <span className="lumi-control-shell">
                <span className="lumi-control-icon" aria-hidden="true">
                  <Type size={14} />
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej. Primera valoración, seguimiento, cierre…"
                  className="lumi-control-field w-full"
                />
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <SectionHeader label="Fecha" className="mb-2" />
              <span className="lumi-control-shell">
                <span className="lumi-control-icon" aria-hidden="true">
                  <CalendarDays size={14} />
                </span>
                <input
                  type="date"
                  value={fechaValue}
                  onChange={(event) => setFechaValue(event.target.value)}
                  className="lumi-control-field lumi-control-field--date w-full"
                />
              </span>
            </div>

            <div>
              <SectionHeader label="Inicio" className="mb-2" />
              <span className="lumi-control-shell">
                <span className="lumi-control-icon" aria-hidden="true">
                  <Clock3 size={14} />
                </span>
                <input
                  type="time"
                  value={horaInicioValue}
                  onChange={(event) => setHoraInicioValue(event.target.value)}
                  className="lumi-control-field lumi-control-field--time w-full"
                />
              </span>
            </div>

            <div>
              <SectionHeader label="Fin" className="mb-2" />
              <span className="lumi-control-shell">
                <span className="lumi-control-icon" aria-hidden="true">
                  <Clock3 size={14} />
                </span>
                <input
                  type="time"
                  value={horaFinValue}
                  onChange={(event) => setHoraFinValue(event.target.value)}
                  className="lumi-control-field lumi-control-field--time w-full"
                />
              </span>
            </div>
          </div>

          {eventType === 'patient' && (
            <div>
              <SectionHeader label="Modalidad" className="mb-2" />
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(APPOINTMENT_MODALIDAD_CONFIG) as [AppointmentModalidad, typeof APPOINTMENT_MODALIDAD_CONFIG[AppointmentModalidad]][]).map(([value, { label, color: itemColor, Icon }]) => {
                  const isActive = modalidad === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setModalidad(value)}
                      className="py-2.5 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5"
                      style={isActive ? {
                        background: `${itemColor}22`,
                        color: itemColor,
                        border: `1px solid ${itemColor}44`,
                      } : inactiveToggle}
                    >
                      <Icon size={12} style={{ color: isActive ? itemColor : undefined }} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {eventType === 'general' && (
            <>
              <div>
                <SectionHeader label="Categoria (opcional)" className="mb-2" />
                <span className="lumi-control-shell">
                  <span className="lumi-control-icon" aria-hidden="true">
                    <Tag size={14} />
                  </span>
                  <input
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Ej. Personal, Equipo, Formación…"
                    className="lumi-control-field w-full"
                  />
                </span>
              </div>

              <div>
                <SectionHeader label="Color (opcional)" className="mb-2" />
                <div className="grid grid-cols-5 gap-1.5">
                  {GENERAL_EVENT_COLOR_PRESETS.map((preset) => {
                    const active = color === preset.value
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setColor((current) => current === preset.value ? null : preset.value)}
                        className="rounded-[14px] px-3 py-3 flex items-center justify-center gap-1.5 text-[12px] font-medium"
                        style={active ? {
                          background: `${preset.value}22`,
                          color: preset.textColor,
                          border: `1px solid ${preset.value}44`,
                        } : inactiveToggle}
                      >
                        <preset.Icon size={12} style={{ color: active ? preset.value : undefined }} />
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <SectionHeader label="Recurrencia" className="mb-2" />
            <div className="space-y-3">
              <span className="lumi-control-shell">
                <span className="lumi-control-icon" aria-hidden="true">
                  <Repeat2 size={14} />
                </span>
                <span className="lumi-control-affordance" aria-hidden="true">
                  <ChevronDown size={14} />
                </span>
                <select
                  value={recurrencePreset}
                  onChange={(event) => setRecurrencePreset(event.target.value as AppointmentRecurrencePreset)}
                  className="lumi-control-field lumi-control-field--select w-full"
                >
                  {RECURRENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </span>

              {recurrencePreset !== 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <SectionHeader label="Hasta" className="mb-2" />
                    <span className="lumi-control-shell">
                      <span className="lumi-control-icon" aria-hidden="true">
                        <CalendarDays size={14} />
                      </span>
                      <input
                        type="date"
                        value={recurrenceUntilDate}
                        onChange={(event) => setRecurrenceUntilDate(event.target.value)}
                        className="lumi-control-field lumi-control-field--date w-full"
                      />
                    </span>
                  </div>

                  {recurrencePreset === 'custom' && (
                    <div className="grid grid-cols-[0.7fr_1fr] gap-2">
                      <div>
                        <SectionHeader label="Cada" className="mb-2" />
                        <span className="lumi-control-shell">
                          <input
                            type="number"
                            min={1}
                            value={customInterval}
                            onChange={(event) => setCustomInterval(event.target.value)}
                            className="lumi-control-field w-full"
                          />
                        </span>
                      </div>
                      <div>
                        <SectionHeader label="Unidad" className="mb-2" />
                        <span className="lumi-control-shell">
                          <span className="lumi-control-affordance" aria-hidden="true">
                            <ChevronDown size={14} />
                          </span>
                          <select
                            value={customUnit}
                            onChange={(event) => setCustomUnit(event.target.value as AppointmentRecurrenceUnit)}
                            className="lumi-control-field lumi-control-field--select w-full"
                          >
                            {CUSTOM_UNIT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(recurrencePreset === 'selected-weekdays' || (recurrencePreset === 'custom' && customUnit === 'week')) && (
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_OPTIONS.map((option) => {
                    const active = selectedWeekdays.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleWeekday(option.value)}
                        className="h-9 w-9 rounded-full text-[12px] font-medium transition-all"
                        style={active ? {
                          background: 'rgba(200, 188, 205, 0.30)',
                          color: 'var(--ink-cool-strong)',
                          border: '1px solid var(--border-glass-muted)',
                        } : inactiveToggle}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader label="Notas (opcional)" className="mb-2" />
            <textarea
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              placeholder="Observaciones, contexto…"
              rows={2}
              className="lumi-control-field w-full rounded-[14px] px-3.5 py-3 text-[13px] resize-none"
            />
          </div>

          {occurrences.length > 0 && !scheduleError && !recurrenceError && (
            <div
              className="rounded-[10px] px-3 py-2"
              style={{ background: 'rgba(143,165,189,0.10)', border: '1px solid rgba(143,165,189,0.16)' }}
            >
              <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
                {recurrenceRule ? 'Serie' : 'Horario'}
              </p>
              <p className="text-[13px] font-medium capitalize mt-1" style={{ color: 'var(--ink-cool-strong)' }}>
                {formatDateTimeRange(occurrences[0].start, occurrences[0].end)}
              </p>
              {occurrences.length > 1 && (
                <p className="text-[12px] mt-1" style={{ color: 'var(--ink-cool-soft)' }}>
                  {formatOccurrenceCount(occurrences.length)} · última ocurrencia el {occurrences[occurrences.length - 1].start.toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
          )}

          {(scheduleError || recurrenceError || titleError || patientError) && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]"
              style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
            >
              <AlertTriangle size={13} />
              {scheduleError || recurrenceError || titleError || patientError}
            </div>
          )}

          {conflict && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]"
              style={{ background: 'var(--state-warning-bg)', color: 'var(--state-warning-text)' }}
            >
              <AlertTriangle size={13} />
              <span>
                Conflicto con {buildAppointmentDisplayTitle(conflict)}
                {' · '}
                {formatConflictDateTime(conflict)}
                {' · '}Corrige el horario para poder guardar.
              </span>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {error}
            </p>
          )}

          <Button
            variant="action"
            onClick={handleSave}
            disabled={isSaveBlocked}
            className="w-full py-3 text-xs tracking-[0.06em] uppercase gap-2"
          >
            <Plus size={14} />
            {saving ? 'Guardando…' : `Crear ${recurrenceRule ? 'serie' : eventType === 'patient' ? 'cita' : 'evento'}`}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
