'use client'
// ============================================================
// NEW APPOINTMENT MODAL — formulario para crear una cita nueva
// Se abre al tocar un slot vacío en el calendario o el botón "+"
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, AlertTriangle } from 'lucide-react'
import { Appointment, Patient, AppointmentModalidad } from '@/types'
import {
  buildLocalAppointmentStart,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  findAppointmentConflict,
  getAppointmentDurationOptions,
  getAppointmentEnd,
  getAppointmentEndFromDuration,
} from '@/lib/appointments'
import { createClient } from '@/lib/supabase/client'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'

interface NewAppointmentModalProps {
  appointments: Appointment[]
  defaultStart: Date
  onClose: () => void
}

const MODALIDADES: { value: AppointmentModalidad; label: string }[] = [
  { value: 'online',   label: 'Online'   },
  { value: 'medellin', label: 'Medellín' },
  { value: 'retiro',   label: 'Retiro'   },
]

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function toTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,250,247,0.74)',
  color: 'var(--ink-strong)',
  border: '1px solid transparent',
  outline: 'none',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
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

function formatDateTimeRange(start: Date, end: Date): string {
  return `${start.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${formatTimeRange(start, end)}`
}

function formatDurationLabel(value: number): string {
  if (value < 60) return `${value} min`
  if (value % 60 === 0) return `${value / 60} hora${value === 60 ? '' : 's'}`
  return `${Math.floor(value / 60)}h ${value % 60}min`
}

export default function NewAppointmentModal({ appointments, defaultStart, onClose }: NewAppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [patients, setPatients]           = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [search, setSearch]               = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [fechaValue, setFechaValue]       = useState(toDateInputValue(defaultStart))
  const [horaInicioValue, setHoraInicioValue] = useState(toTimeInputValue(defaultStart))
  const [duracion, setDuracion]           = useState(DEFAULT_APPOINTMENT_DURATION_MINUTES)
  const [modalidad, setModalidad]         = useState<AppointmentModalidad>('online')
  const [notas, setNotas]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('patients')
      .select('*')
      .order('nombre', { ascending: true })
      .then(({ data }) => {
        setPatients((data as Patient[]) ?? [])
        setLoadingPatients(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPatients = search
    ? patients.filter((p) =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(search.toLowerCase())
      )
    : patients

  function selectPatient(p: Patient) {
    setSelectedPatient(p)
    setSearch('')
    setShowDropdown(false)
  }

  const startDate = buildLocalAppointmentStart(fechaValue, horaInicioValue)
  const endDate = startDate
    ? getAppointmentEndFromDuration(startDate, duracion)
    : null

  let scheduleError: string | null = null
  if (!startDate || !endDate) {
    scheduleError = 'Completa fecha y hora.'
  } else if (duracion < 15) {
    scheduleError = 'La duración mínima es de 15 minutos.'
  }

  const conflicto = !scheduleError && startDate && endDate
    ? findAppointmentConflict(appointments, startDate, endDate)
    : undefined

  const isSaveBlocked = saving || !selectedPatient || !!scheduleError || !!conflicto
  const durationOptions = getAppointmentDurationOptions(duracion)

  async function handleSave() {
    if (!selectedPatient) { setError('Selecciona un paciente'); return }
    if (!startDate || !endDate || scheduleError || conflicto) return

    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setSaving(false); return }

    const { error: insertError } = await supabase.from('appointments').insert({
      patient_id:     selectedPatient.id,
      user_id:        user.id,
      fecha_inicio:   startDate.toISOString(),
      fecha_fin:      endDate.toISOString(),
      modalidad,
      estado_sesion:  'pendiente',
      estado_pago:    'pendiente',
      notas:          notas.trim() || null,
      doctoralia_uid: null,
    })

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

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div>
            <SectionHeader label="Nueva cita" className="mb-2" />
            <h2 className="editorial-title text-[1.3rem]" style={{ color: 'var(--ink-cool-strong)' }}>
              Agendar sesión
            </h2>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Cerrar" className="p-2.5">
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 pb-5 space-y-4">

          {/* ── Paciente ── */}
          <div>
            <SectionHeader label="Paciente" className="mb-2" />
            {selectedPatient ? (
              <div
                className="flex items-center justify-between px-3.5 py-3 rounded-[14px]"
                style={{ background: 'rgba(255,250,247,0.74)', border: '1px solid var(--border-medium)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)' }}
              >
                <span className="text-[13px]" style={{ color: 'var(--ink-strong)' }}>
                  {selectedPatient.nombre} {selectedPatient.apellido}
                </span>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-[11px] ml-2 shrink-0"
                  style={{ color: 'var(--ink-cool-muted)' }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder={loadingPatients ? 'Cargando pacientes…' : 'Buscar paciente…'}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[13px]"
                  disabled={loadingPatients}
                  autoComplete="off"
                />
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
                      filteredPatients.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => selectPatient(p)}
                          className="w-full text-left px-3.5 py-2.5 text-[13px] transition-colors"
                          style={{ color: 'var(--ink-strong)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(148,136,176,0.10)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {p.nombre} {p.apellido}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Fecha y hora ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionHeader label="Fecha" className="mb-2" />
              <input
                type="date"
                value={fechaValue}
                onChange={(e) => setFechaValue(e.target.value)}
                className="w-full rounded-[14px] px-3.5 py-3 text-[13px]"
              />
            </div>
            <div>
              <SectionHeader label="Hora" className="mb-2" />
              <input
                type="time"
                value={horaInicioValue}
                onChange={(e) => setHoraInicioValue(e.target.value)}
                className="w-full rounded-[14px] px-3.5 py-3 text-[13px]"
              />
            </div>
          </div>

          {/* ── Duración + Modalidad ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionHeader label="Duración" className="mb-2" />
              <select
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-full rounded-[14px] px-3.5 py-3 text-[13px]"
                style={selectStyle}
              >
                {durationOptions.map((value) => (
                  <option key={value} value={value}>{formatDurationLabel(value)}</option>
                ))}
              </select>
            </div>
            <div>
              <SectionHeader label="Modalidad" className="mb-2" />
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as AppointmentModalidad)}
                className="w-full rounded-[14px] px-3.5 py-3 text-[13px]"
                style={selectStyle}
              >
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Notas opcionales ── */}
          <div>
            <SectionHeader label="Notas (opcional)" className="mb-2" />
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, contexto…"
              rows={2}
              className="w-full rounded-[14px] px-3.5 py-3 text-[13px] resize-none"
            />
          </div>

          {startDate && endDate && !scheduleError && (
            <p className="text-[12px]" style={{ color: 'var(--ink-cool-soft)' }}>
              Horario: {formatDateTimeRange(startDate, endDate)}
              {` · ${duracion} min`}
            </p>
          )}

          {scheduleError && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]"
              style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
            >
              <AlertTriangle size={13} />
              {scheduleError}
            </div>
          )}

          {conflicto && (
            <div
              className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]"
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

          {error && (
            <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {error}
            </p>
          )}

          {/* ── CTA ── */}
          <Button
            variant="action"
            onClick={handleSave}
            disabled={isSaveBlocked}
            className="w-full py-3 text-xs tracking-[0.06em] uppercase gap-2"
          >
            <Plus size={14} />
            {saving ? 'Guardando…' : conflicto ? 'Corrige el conflicto para crear' : 'Crear cita'}
          </Button>

        </div>
      </div>
    </ModalShell>
  )
}
