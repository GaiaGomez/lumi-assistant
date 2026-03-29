'use client'
// ============================================================
// AGENDA CLIENT — calendario profesional con categorías, festivos
// y lectura optimizada para el uso diario de Lu
// ============================================================

import { useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Appointment, CalendarEvent } from '@/types'
import { APPOINTMENT_SESSION_LABEL } from '@/lib/appointment-status'
import AppointmentModal from './AppointmentModal'
import NewAppointmentModal from './NewAppointmentModal'
import { ChevronLeft, ChevronRight, Monitor, MapPin, Leaf, Plus } from 'lucide-react'
import { getTodayAppointments } from '@/lib/appointments'

moment.locale('es')
const localizer = momentLocalizer(moment)

// ─────────────────────────────────────────────────────────────
// FESTIVOS COLOMBIANOS 2026 — fuente explícita y verificada
// Fechas oficiales según el calendario colombiano 2026.
// Map: 'YYYY-MM-DD' → nombre del festivo
// ─────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  )
}

const FESTIVOS_CO: Map<string, string> = new Map([
  ['2026-01-01', 'Año Nuevo'],
  ['2026-01-12', 'Reyes Magos'],
  ['2026-03-23', 'Día de San José'],
  ['2026-04-02', 'Jueves Santo'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Día del Trabajo'],
  ['2026-05-18', 'Ascensión de Jesús'],
  ['2026-06-08', 'Corpus Christi'],
  ['2026-06-15', 'Sagrado Corazón'],
  ['2026-06-29', 'San Pedro y San Pablo'],
  ['2026-07-20', 'Día de la Independencia'],
  ['2026-08-07', 'Batalla de Boyacá'],
  ['2026-08-17', 'Asunción de la Virgen'],
  ['2026-10-12', 'Día de la Raza'],
  ['2026-11-02', 'Todos los Santos'],
  ['2026-11-16', 'Independencia de Cartagena'],
  ['2026-12-08', 'Inmaculada Concepción'],
  ['2026-12-25', 'Navidad'],
])

// ─────────────────────────────────────────────────────────────
// CATEGORÍAS — fuente principal: campo `modalidad`
// Fallback temporal: detección por notas (citas legacy sin modalidad)
// ─────────────────────────────────────────────────────────────

type Categoria = 'online' | 'medellin' | 'retiro' | 'default'

/** Fallback legacy: infiere categoría desde el texto libre de notas */
function inferirDesdeNotas(notas: string | null): Categoria {
  const n = notas?.toLowerCase() ?? ''
  if (n.includes('retiro')) return 'retiro'
  if (n.includes('online') || n.includes('virtual')) return 'online'
  if (n.includes('medell')) return 'medellin'
  return 'default'
}

/** Fuente de verdad: modalidad del campo real; fallback a notas para datos legacy */
function resolverCategoria(apt: Appointment): Categoria {
  if (apt.modalidad) return apt.modalidad
  return inferirDesdeNotas(apt.notas)
}

const CATEGORIA_CONFIG: Record<Categoria, {
  bg: string
  label: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> | null
}> = {
  online:   { bg: '#8FA5BD', label: 'Online',   Icon: Monitor },
  medellin: { bg: '#9488B0', label: 'Medellín', Icon: MapPin  },
  retiro:   { bg: '#7EA88F', label: 'Retiro',   Icon: Leaf    },
  default:  { bg: '#B2A8B4', label: 'Sesión',   Icon: null    },
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES DEL CALENDARIO
// ─────────────────────────────────────────────────────────────

// Card de cita — dos líneas:
//   Línea 1: [icono modalidad] Nombre Apellido  (icono comunica modalidad, nombre puede truncar)
//   Línea 2: Estado  (sola en su línea, nunca se corta)
// Las canceladas se filtran antes de llegar aquí
function EventoCalendario({ event }: { event: CalendarEvent }) {
  const apt = event.resource
  const { Icon } = CATEGORIA_CONFIG[resolverCategoria(apt)]
  const estado = apt.estado_sesion === 'cancelo' ? '' : APPOINTMENT_SESSION_LABEL[apt.estado_sesion]
  return (
    <div style={{ lineHeight: 1.35, overflow: 'hidden', minHeight: 0 }}>
      {/* Línea 1: icono de modalidad + nombre del paciente */}
      <p style={{
        fontWeight: 700, fontSize: '11px', marginBottom: '1px',
        display: 'flex', alignItems: 'center', gap: '4px',
        overflow: 'hidden',
      }}>
        {Icon && (
          <Icon size={9} style={{ color: 'white', flexShrink: 0 }} />
        )}
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: 'white',
        }}>
          {event.title}
        </span>
      </p>
      {/* Línea 2: estado de sesión — nunca se trunca porque es lo único en su línea */}
      {estado && (
        <p style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.88)',
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          {estado}
        </p>
      )}
    </div>
  )
}

// Cabecera de fecha en vista Mes — festivo se comunica solo por el tinte del día
function CabechaFecha({ date: _date, label }: { date: Date; label: string }) {
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
      <span>{label}</span>
    </div>
  )
}

// Cabecera de columna en vista Semana/Día — festivo se comunica con una etiqueta sutil
function ColumnaHeader({ date, label }: { date: Date; label: string }) {
  const isFestivo = FESTIVOS_CO.has(toDateKey(date))
  return (
    <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
      {isFestivo && (
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-cool-faint)',
            marginBottom: '2px',
          }}
        >
          Festivo
        </div>
      )}
      <span>{label}</span>
    </div>
  )
}

// Pill pequeña para indicadores compactos en la barra
function Pill({ dot, text }: { dot: string; text: string }) {
  return (
    <div
      className="hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0"
      style={{ background: 'rgba(255,255,255,0.46)', border: '1px solid var(--border-glass-white)' }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--ink-cool-soft)' }}>
        {text}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface AgendaClientProps {
  appointments: Appointment[]
}

type ModalidadFiltro = 'online' | 'medellin' | 'retiro'

export default function AgendaClient({ appointments }: AgendaClientProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [newSlotStart, setNewSlotStart] = useState<Date | null>(null)
  const [currentView, setCurrentView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filtrosActivos, setFiltrosActivos] = useState<Set<ModalidadFiltro>>(new Set())

  function toggleFiltro(key: ModalidadFiltro) {
    setFiltrosActivos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Rango visible según la vista activa — se actualiza al navegar
  const { visibleStart, visibleEnd } = useMemo(() => {
    const m = moment(currentDate)
    if (currentView === 'day') return {
      visibleStart: m.clone().startOf('day').toDate(),
      visibleEnd:   m.clone().endOf('day').toDate(),
    }
    if (currentView === 'week') return {
      visibleStart: m.clone().startOf('week').toDate(),
      visibleEnd:   m.clone().endOf('week').toDate(),
    }
    return {
      visibleStart: m.clone().startOf('month').toDate(),
      visibleEnd:   m.clone().endOf('month').toDate(),
    }
  }, [currentView, currentDate])

  // "N hoy" — siempre del día real, independiente del período navegado
  const refDate    = useMemo(() => new Date(), [])
  const todayCount = useMemo(() => getTodayAppointments(appointments, refDate).length, [appointments, refDate])

  // "N por confirmar" — solo las pendientes dentro del período visible
  const pendingCount = useMemo(() =>
    appointments.filter((a) => {
      if (a.estado_sesion !== 'pendiente') return false
      const s = new Date(a.fecha_inicio)
      return s >= visibleStart && s <= visibleEnd
    }).length,
    [appointments, visibleStart, visibleEnd]
  )

  // Las citas canceladas no se muestran — siguen en BD para historial
  const events: CalendarEvent[] = appointments
    .filter((apt) => apt.estado_sesion !== 'cancelo')
    .map((apt) => ({
      id:    apt.id,
      title: apt.patient ? `${apt.patient.nombre} ${apt.patient.apellido}` : apt.notas ?? 'Cita',
      start: new Date(apt.fecha_inicio),
      end:   apt.fecha_fin
        ? new Date(apt.fecha_fin)
        : new Date(new Date(apt.fecha_inicio).getTime() + 60 * 60 * 1000),
      resource: apt,
    }))

  // Aplicar filtro de modalidad — si no hay filtros activos, se muestran todos
  const visibleEvents = useMemo(() =>
    filtrosActivos.size === 0
      ? events
      : events.filter((evt) => filtrosActivos.has(resolverCategoria(evt.resource) as ModalidadFiltro)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, filtrosActivos]
  )

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedAppointment(event.resource)
  }, [])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setNewSlotStart(slotInfo.start)
  }, [])

  // Fondo del evento: color de categoría
  const eventPropGetter = useCallback((event: CalendarEvent) => ({
    style: {
      backgroundColor: CATEGORIA_CONFIG[resolverCategoria(event.resource)].bg,
      borderRadius: '10px',
      border: '1px solid rgba(255,250,248,0.18)',
      color: '#fffaf8',
      padding: '3px 8px',
      boxShadow: '0 6px 18px rgba(60,50,70,0.16)',
    }
  }), [])

  // Fondo de cada día: festivos (tinte muy sutil) + fines de semana (mauve apenas perceptible)
  const dayPropGetter = useCallback((date: Date) => {
    const dow = date.getDay()
    const isFestivo = FESTIVOS_CO.has(toDateKey(date))
    const isWeekend = dow === 0 || dow === 6
    if (isFestivo) return { style: { background: 'rgba(185,143,149,0.07)' } }
    if (isWeekend) return { style: { background: 'rgba(175,175,210,0.05)' } }
    return {}
  }, [])

  // Etiqueta del período visible
  const periodoLabel = () => {
    if (currentView === 'month') return moment(currentDate).format('MMMM YYYY')
    if (currentView === 'week') {
      const s = moment(currentDate).startOf('week')
      const e = moment(currentDate).endOf('week')
      return `${s.format('D')} – ${e.format('D MMM YYYY')}`
    }
    return moment(currentDate).format('dddd D MMM YYYY')
  }

  function navegar(dir: 'prev' | 'next' | 'today') {
    const unit = currentView === 'month' ? 'month' : currentView === 'week' ? 'week' : 'day'
    if (dir === 'today')     setCurrentDate(new Date())
    else if (dir === 'prev') setCurrentDate((d) => moment(d).subtract(1, unit).toDate())
    else                     setCurrentDate((d) => moment(d).add(1, unit).toDate())
  }

  return (
    <div className="space-y-2">

      {/* ── Barra superior compacta ── */}
      <div className="glass-cool rounded-[18px] px-4 py-2.5 flex items-center gap-3 flex-wrap">

        {/* Navegación + período + indicadores */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button onClick={() => navegar('prev')} aria-label="Período anterior" className="btn-subtle p-2 shrink-0">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => navegar('next')} aria-label="Período siguiente" className="btn-subtle p-2 shrink-0">
            <ChevronRight size={15} />
          </button>
          <h2 className="text-[14px] font-medium capitalize ml-1 editorial-title truncate" style={{ color: 'var(--ink-cool-strong)' }}>
            {periodoLabel()}
          </h2>
          {todayCount > 0 && <Pill dot="#9488B0" text={`${todayCount} hoy`} />}
          {pendingCount > 0 && <Pill dot="#B79B96" text={`${pendingCount} por confirmar`} />}
        </div>

        {/* Vista + Hoy + Nueva cita */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-0.5 p-1 rounded-full" style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-glass-white)' }}>
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                style={currentView === v
                  ? { background: 'rgba(255,255,255,0.92)', color: 'var(--ink-cool-strong)', boxShadow: 'var(--shadow-glass)' }
                  : { color: 'var(--ink-cool-faint)', background: 'transparent' }
                }
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <button onClick={() => navegar('today')} className="btn-subtle px-3 py-1.5 text-[12px]">
            Hoy
          </button>
          <button
            onClick={() => setNewSlotStart(new Date())}
            aria-label="Nueva cita"
            className="btn-action p-2"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* ── Filtros de modalidad ── */}
      <div className="flex items-center gap-2 px-1">
        {((['online', 'medellin', 'retiro'] as const)).map((key) => {
          const cfg = CATEGORIA_CONFIG[key]
          const Icon = cfg.Icon
          const activo = filtrosActivos.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleFiltro(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
              style={activo ? {
                background: cfg.bg,
                color: 'white',
                border: `1px solid ${cfg.bg}`,
                boxShadow: `0 2px 8px ${cfg.bg}44`,
              } : {
                background: 'rgba(255,255,255,0.38)',
                color: 'var(--ink-cool-muted)',
                border: '1px solid transparent',
              }}
            >
              {Icon && <Icon size={10} style={{ color: activo ? 'white' : cfg.bg }} />}
              {cfg.label}
            </button>
          )
        })}
        {filtrosActivos.size > 0 && (
          <button
            onClick={() => setFiltrosActivos(new Set())}
            className="text-[10px] px-2 py-1 rounded-full transition-all"
            style={{ color: 'var(--ink-cool-faint)', background: 'transparent' }}
          >
            Ver todas
          </button>
        )}
      </div>

      {/* ── Calendario ── */}
      <div className="glass-cool rounded-[24px] overflow-hidden">
        <div className="p-4" style={{ height: '720px' }}>
          <Calendar
            localizer={localizer}
            events={visibleEvents}
            view={currentView}
            date={currentDate}
            onView={setCurrentView}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            selectable
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            components={{ event: EventoCalendario, dateHeader: CabechaFecha, header: ColumnaHeader } as any}
            min={new Date(0, 0, 0, 8, 0)}
            max={new Date(0, 0, 0, 21, 0)}
            messages={{
              today: 'Hoy',
              previous: '‹',
              next: '›',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Lista',
              noEventsInRange: 'No hay citas en este período',
              showMore: (total) => `+${total} más`,
            }}
            culture="es"
            toolbar={false}
          />
        </div>
      </div>

      {/* Modal al tocar una cita existente */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          appointments={appointments}
          onClose={() => setSelectedAppointment(null)}
        />
      )}

      {/* Modal para crear una cita nueva */}
      {newSlotStart && (
        <NewAppointmentModal
          appointments={appointments}
          defaultStart={newSlotStart}
          onClose={() => setNewSlotStart(null)}
        />
      )}
    </div>
  )
}
