'use client'
// ============================================================
// NEW APPOINTMENT MODAL — formulario para crear una cita nueva
// Se abre al tocar un slot vacío en el calendario o el botón "+"
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import { Patient, AppointmentModalidad } from '@/types'
import { createClient } from '@/lib/supabase/client'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'

interface NewAppointmentModalProps {
  defaultStart: Date
  onClose: () => void
}

const DURACIONES = [
  { value: 30,  label: '30 min'   },
  { value: 45,  label: '45 min'   },
  { value: 60,  label: '1 hora'   },
  { value: 90,  label: '1h 30min' },
]

const MODALIDADES: { value: AppointmentModalidad; label: string }[] = [
  { value: 'online',   label: 'Online'   },
  { value: 'medellin', label: 'Medellín' },
  { value: 'retiro',   label: 'Retiro'   },
]

/** Convierte un Date a la cadena que espera <input type="datetime-local"> */
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes())
  )
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,250,247,0.74)',
  color: 'var(--ink-strong)',
  border: '1px solid transparent',
  outline: 'none',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
}

export default function NewAppointmentModal({ defaultStart, onClose }: NewAppointmentModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [patients, setPatients]           = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [search, setSearch]               = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [fechaInicio, setFechaInicio]     = useState(toDatetimeLocal(defaultStart))
  const [duracion, setDuracion]           = useState(60)
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

  async function handleSave() {
    if (!selectedPatient) { setError('Selecciona un paciente'); return }

    setSaving(true)
    setError(null)

    const startDate = new Date(fechaInicio)
    const endDate   = new Date(startDate.getTime() + duracion * 60 * 1000)

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
          <div>
            <SectionHeader label="Fecha y hora" className="mb-2" />
            <input
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-[14px] px-3.5 py-3 text-[13px]"
            />
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
                {DURACIONES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
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

          {error && (
            <p className="text-[12px] text-center" style={{ color: 'var(--state-cancel-text)' }}>
              {error}
            </p>
          )}

          {/* ── CTA ── */}
          <Button
            variant="action"
            onClick={handleSave}
            disabled={saving || !selectedPatient}
            className="w-full py-3 text-xs tracking-[0.06em] uppercase gap-2"
          >
            <Plus size={14} />
            {saving ? 'Guardando…' : 'Crear cita'}
          </Button>

        </div>
      </div>
    </ModalShell>
  )
}
