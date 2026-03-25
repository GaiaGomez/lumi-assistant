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

// Paleta de colores tierra para los estados — consistent con el resto de la app
const COLORES_ESTADO: Record<string, string> = {
  pendiente:  '#C4A882',  // arena cálido
  asistio:    '#7FA882',  // sage verde
  cancelo:    '#C48882',  // rose dusty
  no_asistio: '#C4A066',  // ámbar tierra
  pago_pend:  '#B8956A',  // terracota — asistió pero debe
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
        borderRadius: '10px',
        border: 'none',
        color: 'white',
        fontSize: '11px',
        fontWeight: '500',
        padding: '3px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
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

      {/* ── Barra superior: navegación + view picker ── */}
      <div className="flex items-center justify-between">

        {/* Período actual + flechas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navegar('prev')}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(248,243,238,0.80)', color: '#9C8878' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navegar('next')}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(248,243,238,0.80)', color: '#9C8878' }}
          >
            <ChevronRight size={16} />
          </button>
          {/* Nombre del período */}
          <h2 className="text-base font-medium capitalize ml-1" style={{ color: '#2D2520' }}>
            {periodoLabel()}
          </h2>
        </div>

        {/* View picker — pill flotante como el referente */}
        <div className="flex gap-0.5 p-1 rounded-2xl" style={{ background: 'rgba(248,243,238,0.80)' }}>
          {(['day', 'week', 'month'] as View[]).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
              style={currentView === view ? {
                background: 'white',
                color: '#6B5844',
                boxShadow: '0 1px 8px rgba(139,115,85,0.10)',
              } : {
                color: '#B4A494',
                background: 'transparent',
              }}
            >
              {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
          {/* Botón Hoy */}
          <button
            onClick={() => navegar('today')}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all ml-1"
            style={{ color: '#C4A882', background: 'transparent' }}
          >
            Hoy
          </button>
        </div>
      </div>

      {/* ── El calendario — card limpia sin líneas ── */}
      <div className="glass rounded-3xl overflow-hidden" style={{ minHeight: '620px' }}>
        <div className="p-5" style={{ height: '620px' }}>
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
            // Estas props hacen que la navegación interna del toolbar no interfiera
            // (ocultamos el toolbar via CSS y usamos nuestra propia navegación)
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
