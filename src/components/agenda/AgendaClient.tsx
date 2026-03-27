'use client'
// ============================================================
// AGENDA CLIENT — calendario con categorías por color/icono
// Categorías detectadas desde el campo notas: Online / Medellín / Retiro
// ============================================================

import { useState, useCallback } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Appointment, CalendarEvent } from '@/types'
import AppointmentModal from './AppointmentModal'
import { ChevronLeft, ChevronRight, Monitor, MapPin, Leaf } from 'lucide-react'

moment.locale('es')
const localizer = momentLocalizer(moment)

interface AgendaClientProps {
  appointments: Appointment[]
}

// ── Categorías ────────────────────────────────────────────────
type Categoria = 'online' | 'medellin' | 'retiro' | 'default'

function detectarCategoria(notas: string | null): Categoria {
  const n = notas?.toLowerCase() ?? ''
  if (n.includes('retiro')) return 'retiro'
  if (n.includes('online') || n.includes('virtual')) return 'online'
  if (n.includes('medell')) return 'medellin'
  return 'default'
}

const CATEGORIA_CONFIG: Record<Categoria, {
  bg: string
  label: string
  Icon: React.ComponentType<{ size?: number }> | null
}> = {
  online:   { bg: '#8FA5BD', label: 'Online',   Icon: Monitor },
  medellin: { bg: '#9488B0', label: 'Medellín', Icon: MapPin },
  retiro:   { bg: '#7EA88F', label: 'Retiro',   Icon: Leaf },
  default:  { bg: '#B2A8B4', label: 'Sesión',   Icon: null },
}

// ── Estado → etiqueta legible ─────────────────────────────────
const ESTADO_LABEL: Record<Appointment['estado_sesion'], string> = {
  pendiente:  'Por confirmar',
  asistio:    'Confirmada',
  cancelo:    'Canceló',
  no_asistio: 'No asistió',
}

// ── Componente de evento personalizado ────────────────────────
// Muestra: nombre del paciente + [icono] categoría · estado
// No repite la hora (ya la muestra la grilla)
function EventoCalendario({ event }: { event: CalendarEvent }) {
  const apt = event.resource
  const cat = detectarCategoria(apt.notas)
  const { label, Icon } = CATEGORIA_CONFIG[cat]

  return (
    <div style={{ lineHeight: 1.35, overflow: 'hidden' }}>
      <p style={{
        fontWeight: 600,
        fontSize: '11px',
        marginBottom: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {event.title}
      </p>
      <p style={{
        fontSize: '10px',
        opacity: 0.82,
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        {Icon && <Icon size={9} />}
        {label} · {ESTADO_LABEL[apt.estado_sesion]}
      </p>
    </div>
  )
}

export default function AgendaClient({ appointments }: AgendaClientProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [currentView, setCurrentView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const events: CalendarEvent[] = appointments.map((apt) => ({
    id: apt.id,
    title: apt.patient
      ? `${apt.patient.nombre} ${apt.patient.apellido}`
      : apt.notas ?? 'Cita',
    start: new Date(apt.fecha_inicio),
    end: apt.fecha_fin
      ? new Date(apt.fecha_fin)
      : new Date(new Date(apt.fecha_inicio).getTime() + 60 * 60 * 1000),
    resource: apt,
  }))

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedAppointment(event.resource)
  }, [])

  // Color de fondo por categoría (derivada de notas)
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const cat = detectarCategoria(event.resource.notas)
    return {
      style: {
        backgroundColor: CATEGORIA_CONFIG[cat].bg,
        borderRadius: '10px',
        border: '1px solid rgba(255,250,248,0.18)',
        color: '#fffaf8',
        fontSize: '11px',
        padding: '3px 8px',
        boxShadow: '0 6px 18px rgba(60,50,70,0.16)',
      }
    }
  }, [])

  // Etiqueta del período actual
  const periodoLabel = () => {
    if (currentView === 'month') return moment(currentDate).format('MMMM YYYY')
    if (currentView === 'week') {
      const start = moment(currentDate).startOf('week')
      const end   = moment(currentDate).endOf('week')
      return `${start.format('D')} – ${end.format('D MMM YYYY')}`
    }
    return moment(currentDate).format('dddd D MMM YYYY')
  }

  function navegar(dir: 'prev' | 'next' | 'today') {
    const unit = currentView === 'month' ? 'month' : currentView === 'week' ? 'week' : 'day'
    if (dir === 'today')     setCurrentDate(new Date())
    else if (dir === 'prev') setCurrentDate(d => moment(d).subtract(1, unit).toDate())
    else                     setCurrentDate(d => moment(d).add(1, unit).toDate())
  }

  return (
    <div className="space-y-3">

      {/* ── Barra de navegación compacta ── */}
      <div className="glass-cool rounded-[18px] px-4 py-2.5 flex items-center justify-between gap-3">

        {/* Izquierda: flechas + período */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => navegar('prev')}
            aria-label="Período anterior"
            className="btn-subtle p-2 shrink-0"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => navegar('next')}
            aria-label="Período siguiente"
            className="btn-subtle p-2 shrink-0"
          >
            <ChevronRight size={15} />
          </button>
          <h2
            className="text-[14px] font-medium capitalize ml-1 editorial-title truncate"
            style={{ color: 'var(--ink-cool-strong)' }}
          >
            {periodoLabel()}
          </h2>
        </div>

        {/* Derecha: selector de vista + Hoy */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex gap-0.5 p-1 rounded-full"
            style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-glass-white)' }}
          >
            {(['day', 'week', 'month'] as View[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                style={currentView === view ? {
                  background: 'rgba(255,255,255,0.92)',
                  color: 'var(--ink-cool-strong)',
                  boxShadow: 'var(--shadow-glass)',
                } : {
                  color: 'var(--ink-cool-faint)',
                  background: 'transparent',
                }}
              >
                {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <button
            onClick={() => navegar('today')}
            className="btn-subtle px-3 py-1.5 text-[12px]"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* ── Calendario ── */}
      <div className="glass-cool rounded-[24px] overflow-hidden">
        <div className="p-4" style={{ height: '720px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            view={currentView}
            date={currentDate}
            onView={setCurrentView}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            components={{ event: EventoCalendario as any }}
            min={new Date(0, 0, 0, 7, 0)}
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

      {/* Modal al tocar una cita */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  )
}
