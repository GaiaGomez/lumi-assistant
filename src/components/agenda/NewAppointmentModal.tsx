'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Clock3,
  Loader2,
  MapPin,
  Plus,
  Repeat2,
  Type,
  UserRound,
  X,
} from 'lucide-react'
import type {
  Appointment,
  AppointmentEventType,
  AppointmentRecurrencePreset,
  AppointmentRecurrenceRule,
  AppointmentRecurrenceUnit,
  AppointmentWeekday,
  Consultorio,
  Patient,
} from '@/types'
import {
  buildLocalAppointmentStart,
  buildRecurringAppointmentWindows,
  buildAppointmentDisplayTitle,
  findAppointmentConflict,
  getAppointmentScheduleError,
} from '@/lib/appointments'
import { createAppointments } from '@/lib/appointments/updates'
import { resolveConsultorioDisplayConfig } from '@/lib/consultorios'
import { mapPatientRows } from '@/lib/supabase/mappers'
import { createClient } from '@/lib/supabase/client'
import {
  resolveAgendaAppointmentDurationMinutes,
  type SettingsMap,
} from '@/lib/settings'
import {
  toBogotaDateInputValue,
  toBogotaTimeInputValue,
} from '@/lib/dates/datetime'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'

interface NewAppointmentModalProps {
  appointments: Appointment[]
  consultorios: Consultorio[]
  defaultStart: Date
  settings: SettingsMap
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

function formatOccurrenceCount(count: number): string {
  return `${count} evento${count === 1 ? '' : 's'}`
}

function getWeekdayFromDate(date: Date): AppointmentWeekday {
  return (['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'][date.getDay()] ?? 'mo') as AppointmentWeekday
}

export default function NewAppointmentModal({
  appointments,
  consultorios,
  defaultStart,
  settings,
  onClose,
}: NewAppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const defaultDurationMinutes = resolveAgendaAppointmentDurationMinutes(settings)
  const defaultEnd = addMinutes(defaultStart, defaultDurationMinutes)

  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [title, setTitle] = useState('')
  const [fechaValue, setFechaValue] = useState(toBogotaDateInputValue(defaultStart))
  const [horaInicioValue, setHoraInicioValue] = useState(toBogotaTimeInputValue(defaultStart))
  const [horaFinValue, setHoraFinValue] = useState(toBogotaTimeInputValue(defaultEnd))
  const [horaFinTouched, setHoraFinTouched] = useState(false)
  const [recurrencePreset, setRecurrencePreset] = useState<AppointmentRecurrencePreset>('none')
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState<AppointmentWeekday[]>([getWeekdayFromDate(defaultStart)])
  const [customInterval, setCustomInterval] = useState('2')
  const [customUnit, setCustomUnit] = useState<AppointmentRecurrenceUnit>('week')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatingPatient, setCreatingPatient] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [newPatientNombre, setNewPatientNombre] = useState('')
  const [newPatientApellido, setNewPatientApellido] = useState('')
  const [newPatientTelefono, setNewPatientTelefono] = useState('')
  const [newPatientEmail, setNewPatientEmail] = useState('')
  const [savingNewPatient, setSavingNewPatient] = useState(false)
  const [selectedConsultorioId, setSelectedConsultorioId] = useState<string | null>(
    consultorios[0]?.id ?? null
  )

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

  useEffect(() => {
    if (horaFinTouched) return

    const nextStart = buildLocalAppointmentStart(fechaValue, horaInicioValue)
    if (!nextStart) return

    setHoraFinValue(toBogotaTimeInputValue(addMinutes(nextStart, defaultDurationMinutes)))
  }, [defaultDurationMinutes, fechaValue, horaFinTouched, horaInicioValue])

  useEffect(() => {
    if (selectedConsultorioId) return
    if (consultorios.length === 0) return
    setSelectedConsultorioId(consultorios[0].id)
  }, [consultorios, selectedConsultorioId])

  const filteredPatients = search
    ? patients.filter((patient) =>
        `${patient.nombre} ${patient.apellido}`.toLowerCase().includes(search.toLowerCase())
      )
    : patients

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setSearch('')
    setShowDropdown(false)
    resetNewPatientForm()
  }

  function resetNewPatientForm() {
    setCreatingPatient(false)
    setNewPatientNombre('')
    setNewPatientApellido('')
    setNewPatientTelefono('')
    setNewPatientEmail('')
  }

  async function handleCreatePatient() {
    if (!newPatientNombre.trim() || !newPatientApellido.trim()) return
    setSavingNewPatient(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('patients')
        .insert({
          nombre: newPatientNombre.trim(),
          apellido: newPatientApellido.trim(),
          telefono: newPatientTelefono.trim() || null,
          email: newPatientEmail.trim() || null,
          user_id: user.id,
          fecha_inicio: new Date().toISOString().split('T')[0],
        })
        .select('*')
        .single()
      if (error || !data) throw error
      const newP: Patient = data as Patient
      setPatients(prev => [...prev, newP].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      selectPatient(newP)
    } catch {
      // silently fail — user can try again
    } finally {
      setSavingNewPatient(false)
    }
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

  const eventType: AppointmentEventType = selectedPatient ? 'patient' : 'general'
  const selectedConsultorio = consultorios.find((consultorio) => consultorio.id === selectedConsultorioId) ?? null

  const titleError = eventType === 'general' && !title.trim()
    ? 'Escribe un titulo o selecciona un paciente.'
    : null

  const isSaveBlocked = saving || !!scheduleError || !!recurrenceError || !!conflict || !!titleError || occurrences.length === 0

  async function handleSave() {
    if (!startDate || !endDate || scheduleError || recurrenceError || conflict) return
    if (eventType === 'general' && !title.trim()) {
      setError('Escribe un titulo o selecciona un paciente.')
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
      consultorio_id: eventType === 'patient' ? selectedConsultorioId : null,
      user_id: user.id,
      event_type: eventType,
      title: title.trim() || null,
      category: null,
      color: null,
      recurrence_group_id: recurrenceGroupId,
      recurrence_rule: recurrenceRule,
      fecha_inicio: occurrence.start.toISOString(),
      fecha_fin: occurrence.end.toISOString(),
      modalidad: null,
      notas: null,
    }))

    const { error: insertError } = await createAppointments(supabase, payload)
    if (insertError) {
      setError('Error al guardar. Intenta otra vez.')
      setSaving(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <ModalShell onClose={onClose}>
      <div>
        <div className="flex items-start justify-between p-4">
          <div>
            <SectionHeader label="Nueva cita" className="mb-2" />
            <h2 className="editorial-panel-title text-[1.05rem]">
              Crear cita
            </h2>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Cerrar" className="p-2.5">
            <X size={18} />
          </Button>
        </div>

        <div className="px-4 pb-4 space-y-4">
          <div>
            <SectionHeader label="Paciente (opcional)" className="mb-2" />
            {selectedPatient ? (
              <div className="lumi-control-shell">
                <div className="lumi-control-field flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="lumi-control-icon" aria-hidden="true" style={{ position: 'static', transform: 'none' }}>
                      <UserRound size={14} />
                    </span>
                    <span className="text-[14px] truncate" style={{ color: 'var(--ink-cool-strong)' }}>
                      {selectedPatient.nombre} {selectedPatient.apellido}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="text-[11px] ml-2 shrink-0"
                    style={{ color: 'var(--ink-cool-muted)' }}
                  >
                    Quitar
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
                    onBlur={(e) => {
                      if (dropdownRef.current?.contains(e.relatedTarget as Node)) return
                      setTimeout(() => setShowDropdown(false), 100)
                    }}
                    className="lumi-control-field w-full"
                    disabled={loadingPatients}
                    autoComplete="off"
                  />
                </span>
                {showDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 z-10 mt-1 rounded-[14px] overflow-hidden"
                    style={{ background: 'rgba(255,250,247,0.98)', border: '1px solid var(--border-glass-white)', boxShadow: 'var(--shadow-float)' }}
                  >
                    {/* Lista de pacientes */}
                    {!creatingPatient && (
                      <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {filteredPatients.slice(0, 8).map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onMouseDown={() => selectPatient(patient)}
                            className="w-full text-left px-3.5 py-2.5 text-[14px] transition-colors"
                            style={{ color: 'var(--ink-strong)' }}
                            onMouseEnter={(event) => (event.currentTarget.style.background = 'rgba(148,136,176,0.10)')}
                            onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                          >
                            {patient.nombre} {patient.apellido}
                          </button>
                        ))}
                        {filteredPatients.length === 0 && search && (
                          <p className="px-3.5 py-2.5 text-[13px]" style={{ color: 'var(--ink-cool-muted)' }}>
                            {`Sin resultados para "${search}"`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Formulario inline nuevo paciente */}
                    {creatingPatient ? (
                      <div className="p-3 space-y-2">
                        <p className="section-kicker mb-0.5">Nuevo paciente</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            autoFocus
                            value={newPatientNombre}
                            onChange={e => setNewPatientNombre(e.target.value)}
                            placeholder="Nombre *"
                            className="w-full rounded-[10px] px-3 py-2 text-[14px] focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(200,196,210,0.5)', color: 'var(--ink-cool-strong)' }}
                          />
                          <input
                            value={newPatientApellido}
                            onChange={e => setNewPatientApellido(e.target.value)}
                            placeholder="Apellido *"
                            className="w-full rounded-[10px] px-3 py-2 text-[14px] focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(200,196,210,0.5)', color: 'var(--ink-cool-strong)' }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={newPatientTelefono}
                            onChange={e => setNewPatientTelefono(e.target.value)}
                            placeholder="Teléfono"
                            className="w-full rounded-[10px] px-3 py-2 text-[14px] focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(200,196,210,0.5)', color: 'var(--ink-cool-strong)' }}
                          />
                          <input
                            value={newPatientEmail}
                            onChange={e => setNewPatientEmail(e.target.value)}
                            placeholder="Correo"
                            type="email"
                            onKeyDown={e => { if (e.key === 'Enter') handleCreatePatient() }}
                            className="w-full rounded-[10px] px-3 py-2 text-[14px] focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(200,196,210,0.5)', color: 'var(--ink-cool-strong)' }}
                          />
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <button
                            type="button"
                            onMouseDown={resetNewPatientForm}
                            className="flex-1 rounded-[10px] py-2 text-[13px]"
                            style={{ background: 'rgba(200,196,210,0.28)', color: 'var(--ink-cool-soft)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onMouseDown={handleCreatePatient}
                            disabled={!newPatientNombre.trim() || !newPatientApellido.trim() || savingNewPatient}
                            className="flex-1 rounded-[10px] py-2 text-[13px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-45"
                            style={{ background: 'rgba(148,136,176,0.22)', color: 'var(--ink-cool-strong)' }}
                          >
                            {savingNewPatient ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                            {savingNewPatient ? 'Creando...' : 'Crear paciente'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onMouseDown={() => setCreatingPatient(true)}
                        className="w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-1.5 transition-colors"
                        style={{
                          color: 'var(--ink-cool-soft)',
                          borderTop: filteredPatients.length > 0 || search ? '1px solid rgba(200,196,210,0.3)' : 'none',
                        }}
                        onMouseEnter={(event) => (event.currentTarget.style.background = 'rgba(148,136,176,0.08)')}
                        onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
                      >
                        <Plus size={13} />
                        Nuevo paciente
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {eventType === 'patient' && (
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
                    <select
                      value={selectedConsultorioId ?? ''}
                      onChange={(event) => setSelectedConsultorioId(event.target.value || null)}
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
                  Aún no tienes consultorios creados. Puedes agregarlos en Configuración.
                </p>
              )}
            </div>
          )}

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
                placeholder={selectedPatient ? 'Opcional si quieres personalizar la cita…' : 'Ej. Almuerzo, Grupo DBT, Reunión…'}
                className="lumi-control-field w-full"
              />
            </span>
          </div>

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
                  onChange={(event) => {
                    setHoraFinTouched(true)
                    setHoraFinValue(event.target.value)
                  }}
                  className="lumi-control-field lumi-control-field--time w-full"
                />
              </span>
            </div>
          </div>

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
                        className="h-9 w-9 rounded-full text-[13px] font-medium transition-all"
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

          {occurrences.length > 1 && !scheduleError && !recurrenceError && (
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
              {formatOccurrenceCount(occurrences.length)} · última ocurrencia el {occurrences[occurrences.length - 1].start.toLocaleDateString('es-CO')}
            </p>
          )}

          {(scheduleError || recurrenceError || titleError) && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[13px]"
              style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
            >
              <AlertTriangle size={13} />
              {scheduleError || recurrenceError || titleError}
            </div>
          )}

          {conflict && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[13px]"
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
            <p className="text-[13px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {error}
            </p>
          )}

          <Button
            variant="action"
            onClick={handleSave}
            disabled={isSaveBlocked}
            className="w-full py-2.5 text-[14px] tracking-[0.06em] uppercase gap-2"
          >
            <Plus size={14} />
            {saving ? 'Guardando…' : `Crear ${recurrenceRule ? 'serie' : 'evento'}`}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
