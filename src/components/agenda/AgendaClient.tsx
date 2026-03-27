'use client'
// ============================================================
// AGENDA CLIENT — calendario minimal, sin líneas de grid
// Layout: view picker flotante arriba + calendar en card limpia
// ============================================================

import { useState, useCallback } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Appointment, CalendarEvent } from '@/types'
import AppointmentModal from './AppointmentModal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

moment.locale('es')
const localizer = momentLocalizer(moment)

interface AgendaClientProps {
  appointments: Appointment[]
}

// Paleta neutral con toque rose para los estados — semántica clara, sin café/verde
const COLORES_ESTADO: Record<string, string> = {
  pendiente:  '#B79B96',
  asistio:    '#839285',
  cancelo:    '#B07C84',
  no_asistio: '#B69B78',
  pago_pend:  '#9A6B72',
}

export default function AgendaClient({ appointments }: AgendaClientProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [currentView, setCurrentView] = useState<View>('week')
  // date controla qué semana/mes/día muestra el calendario
  const [currentDate, setCurrentDate] = useState(new Date())

  // Transformamos appointments al formato de react-big-calendar
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

  // Color de cada evento según estado
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const apt = event.resource
    let bg = COLORES_ESTADO.pendiente

    if (apt.estado_sesion === 'asistio') {
      bg = apt.estado_pago === 'pendiente' ? COLORES_ESTADO.pago_pend : COLORES_ESTADO.asistio
    } else if (apt.estado_sesion === 'cancelo')     bg = COLORES_ESTADO.cancelo
    else if (apt.estado_sesion === 'no_asistio')    bg = COLORES_ESTADO.no_asistio

    return {
      style: {
        backgroundColor: bg,
        borderRadius: '12px',
        border: '1px solid rgba(255,250,248,0.18)',
        color: '#fffaf8',
        fontSize: '11px',
        fontWeight: '600',
        padding: '4px 9px',
        boxShadow: '0 12px 24px rgba(88,62,58,0.14)',
      }
    }
  }, [])

  // Navegación: etiqueta del período actual
  const periodoLabel = () => {
    if (currentView === 'month') {
      return moment(currentDate).format('MMMM YYYY')
    }
    if (currentView === 'week') {
      const start = moment(currentDate).startOf('week')
      const end   = moment(currentDate).endOf('week')
      return `${start.format('D')} – ${end.format('D MMM YYYY')}`
    }
    return moment(currentDate).format('dddd D MMM YYYY')
  }

  // Avanzar / retroceder en el calendario
  function navegar(dir: 'prev' | 'next' | 'today') {
    const unit = currentView === 'month' ? 'month' : currentView === 'week' ? 'week' : 'day'
    if (dir === 'today')  setCurrentDate(new Date())
    else if (dir === 'prev') setCurrentDate(d => moment(d).subtract(1, unit).toDate())
    else                     setCurrentDate(d => moment(d).add(1, unit).toDate())
  }

  return (
    <div className="space-y-4">

      <div className="glass rounded-[28px] px-4 py-3 flex items-center justify-between">

        <div className="flex items-center gap-2">
          <button
            onClick={() => navegar('prev')}
            aria-label={currentView === 'month' ? 'Mes anterior' : currentView === 'week' ? 'Semana anterior' : 'Día anterior'}
            className="btn-secondary p-2.5"
            style={{ color: 'var(--ink-soft)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navegar('next')}
            aria-label={currentView === 'month' ? 'Mes siguiente' : currentView === 'week' ? 'Semana siguiente' : 'Día siguiente'}
            className="btn-secondary p-2.5"
            style={{ color: 'var(--ink-soft)' }}
          >
            <ChevronRight size={16} />
          </button>
          <h2 className="text-base font-medium capitalize ml-2 editorial-title" style={{ color: 'var(--ink-strong)' }}>
            {periodoLabel()}
          </h2>
        </div>

        <div className="flex gap-1 p-1 rounded-full" style={{ background: 'rgba(255,250,247,0.68)', border: '1px solid var(--border-soft)' }}>
          {(['day', 'week', 'month'] as View[]).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={currentView === view ? {
                background: 'rgba(255,252,250,0.98)',
                color: 'var(--ink-strong)',
                boxShadow: 'var(--shadow-soft)',
              } : {
                color: 'var(--ink-faint)',
                background: 'transparent',
              }}
            >
              {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
          <button
            onClick={() => navegar('today')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all ml-1"
            style={{ color: 'var(--ink-soft)', background: 'transparent' }}
          >
            Hoy
          </button>
        </div>
      </div>

      <div className="glass rounded-[34px] overflow-hidden" style={{ minHeight: '620px' }}>
        <div className="p-6" style={{ height: '620px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            view={currentView}
            date={currentDate}
            onView={setCurrentView}
            onNavigate={setCurrentDate}  // react-big-calendar llama esto al navegar internamente
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            min={new Date(0, 0, 0, 7, 0)}   // 7am
            max={new Date(0, 0, 0, 21, 0)}  // 9pm
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
            // Ocultamos el toolbar via CSS y usamos nuestra propia navegación
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
