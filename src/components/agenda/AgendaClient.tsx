'use client'
// ============================================================
// AGENDA CLIENT — el calendario interactivo con react-big-calendar
// "use client" porque react-big-calendar necesita el DOM del navegador
// ============================================================

import { useState, useCallback } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Appointment, CalendarEvent } from '@/types'
import AppointmentModal from './AppointmentModal'

// moment('es'): configura el calendario en español
moment.locale('es')
const localizer = momentLocalizer(moment)

interface AgendaClientProps {
  appointments: Appointment[]
}

export default function AgendaClient({ appointments }: AgendaClientProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [currentView, setCurrentView] = useState<View>('week')

  // Transformamos los appointments al formato que entiende react-big-calendar
  // CalendarEvent requiere: id, title, start (Date), end (Date), resource
  const events: CalendarEvent[] = appointments.map((apt) => ({
    id: apt.id,
    title: apt.patient
      ? `${apt.patient.nombre} ${apt.patient.apellido}`
      : apt.notas ?? 'Cita',
    start: new Date(apt.fecha_inicio),
    end: apt.fecha_fin ? new Date(apt.fecha_fin) : new Date(new Date(apt.fecha_inicio).getTime() + 60 * 60 * 1000), // 1h por defecto
    resource: apt,  // guardamos el objeto completo para accederlo en el modal
  }))

  // Se ejecuta cuando el usuario toca un evento en el calendario
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedAppointment(event.resource)
  }, [])

  // Estilos personalizados por estado de la cita
  // eventPropGetter: función que react-big-calendar llama por cada evento para definir su estilo
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const apt = event.resource
    let backgroundColor = '#78716c'  // stone-500 — pendiente

    if (apt.estado_sesion === 'asistio') backgroundColor = '#65a30d'      // verde
    if (apt.estado_sesion === 'cancelo') backgroundColor = '#dc2626'       // rojo
    if (apt.estado_sesion === 'no_asistio') backgroundColor = '#ea580c'    // naranja
    if (apt.estado_pago === 'pendiente' && apt.estado_sesion === 'asistio') {
      backgroundColor = '#ca8a04'  // amarillo — asistió pero debe
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        border: 'none',
        color: 'white',
        fontSize: '13px',
        padding: '2px 6px',
      }
    }
  }, [])

  return (
    <div className="glass rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(217,201,184,0.35)' }}>

      {/* Selector de vista — glassmorphism pill */}
      <div className="flex gap-2 p-4" style={{ borderBottom: '1px solid rgba(217,201,184,0.25)' }}>
        {(['day', 'week', 'month'] as View[]).map((view) => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={currentView === view ? {
              background: 'linear-gradient(135deg, #8B7355 0%, #6B8F6B 100%)',
              color: 'white',
            } : {
              color: '#9C8878',
            }}
          >
            {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* El calendario */}
      <div className="p-4" style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={currentView}
          onView={setCurrentView}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          // Configuración de horas — rango laboral de Lu
          min={new Date(0, 0, 0, 7, 0)}   // desde las 7am
          max={new Date(0, 0, 0, 21, 0)}  // hasta las 9pm
          messages={{
            // Traducción de los textos del calendario
            today: 'Hoy',
            previous: '‹',
            next: '›',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Lista',
            noEventsInRange: 'No hay citas en este período',
          }}
          culture="es"
        />
      </div>

      {/* Modal que aparece al tocar una cita */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  )
}
