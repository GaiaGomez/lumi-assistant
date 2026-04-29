'use client'
// ============================================================
// AGENDA CLIENT — calendario profesional con categorías, festivos
// y lectura optimizada para el uso diario de Lu
// ============================================================

import { useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import moment from 'moment-timezone'
import 'moment/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Appointment, CalendarEvent, Consultorio } from '@/types'
import AppointmentModal from './AppointmentModal'
import NewAppointmentModal from './NewAppointmentModal'
import MobileAgenda from './MobileAgenda'
import { AlertTriangle, Briefcase, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, HandCoins, Plus } from 'lucide-react'
import { buildAppointmentDisplayTitle, getAppointmentEnd, getTodayAppointments } from '@/lib/appointments'
import {
  appointmentNeedsAttention,
  isAppointmentConfirmed,
  isAppointmentPaid,
  resolveAppointmentVisualConfig,
} from '@/lib/appointments/ui'
import {
  buildConsultorioFilterOptions,
  resolveAppointmentConsultorioFilterKey,
} from '@/lib/consultorios'
import { type SettingsMap } from '@/lib/settings'
import { FESTIVOS_CO } from '@/lib/festivos'
import ConsultorioFilterBar from './ConsultorioFilterBar'

moment.locale('es')
moment.tz.setDefault('America/Bogota')
const localizer = momentLocalizer(moment)

function toDateKey(date: Date): string {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  )
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES DEL CALENDARIO
// ─────────────────────────────────────────────────────────────

// Card de cita — lectura mínima y rápida:
//   Línea 1: Nombre del paciente
//   Línea 2: Iconos compactos de modalidad / confirmación / pago / alerta
// Las canceladas se filtran antes de llegar aquí
function EventoCalendario({
  event,
  settings,
  consultorios,
}: {
  event: CalendarEvent
  settings: SettingsMap
  consultorios: Consultorio[]
}) {
  const apt = event.resource
  if (apt.event_type === 'general') {
    return (
      <div style={{ lineHeight: 1.1, overflow: 'hidden', minHeight: 0, display: 'grid', gap: '4px' }}>
        <p style={{
          fontWeight: 700,
          fontSize: '11px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          color: 'white',
        }}>
          {event.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minHeight: '18px', paddingTop: '1px' }}>
          <Briefcase size={12} style={{ color: 'rgba(255,255,255,0.96)', flexShrink: 0 }} />
          <span style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.94)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {apt.category || apt.notas || 'Evento general'}
          </span>
        </div>
      </div>
    )
  }

  const { Icon } = resolveAppointmentVisualConfig(apt, consultorios, settings)
  const isConfirmed = isAppointmentConfirmed(apt)
  const isPaid = isAppointmentPaid(apt)
  const needsAction = appointmentNeedsAttention(apt)

  return (
    <div style={{ lineHeight: 1.1, overflow: 'hidden', minHeight: 0, display: 'grid', gap: '4px' }}>
      <p style={{
        fontWeight: 700,
        fontSize: '11px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        color: 'white',
      }}>
        {event.title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minHeight: '18px', paddingTop: '1px' }}>
        {Icon && <Icon size={12} style={{ color: 'rgba(255,255,255,0.96)', flexShrink: 0 }} />}
        {isConfirmed ? (
          <Check size={12} style={{ color: 'rgba(255,255,255,0.98)', flexShrink: 0 }} />
        ) : (
          <Clock3 size={12} style={{ color: 'rgba(255,242,235,0.94)', flexShrink: 0 }} />
        )}
        {isPaid ? (
          <CircleDollarSign size={12} style={{ color: 'rgba(255,255,255,0.98)', flexShrink: 0 }} />
        ) : (
          <HandCoins size={12} style={{ color: 'rgba(255,242,235,0.96)', flexShrink: 0 }} />
        )}
        {needsAction && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: 999,
              background: 'rgba(255,247,240,0.92)',
              boxShadow: '0 2px 8px rgba(74, 38, 22, 0.18)',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={11} style={{ color: '#A85A3B' }} />
          </span>
        )}
      </div>
    </div>
  )
}

// Cabecera de fecha en vista Mes — festivo se comunica solo por el tinte del día
function CabechaFecha({ label }: { date: Date; label: string }) {
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
      <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: 'var(--ink-cool-soft)' }}>
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
  consultorios: Consultorio[]
  settings: SettingsMap
}

export default function AgendaClient({
  appointments,
  consultorios,
  settings,
}: AgendaClientProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [newSlotStart, setNewSlotStart] = useState<Date | null>(null)
  const [currentView, setCurrentView] = useState<View>((settings['agenda_vista_default'] as View) ?? 'week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filtrosActivos, setFiltrosActivos] = useState<Set<string>>(new Set())

  // Derivados de settings
  const calMin = useMemo(() => {
    const [h, m] = (settings['agenda_hora_inicio'] ?? '07:00').split(':').map(Number)
    return new Date(0, 0, 0, h, m)
  }, [settings])

  const calMax = useMemo(() => {
    const [h, m] = (settings['agenda_hora_fin'] ?? '21:00').split(':').map(Number)
    return new Date(0, 0, 0, h, m)
  }, [settings])

  const calStep = useMemo(() => {
    const v = parseInt(settings['agenda_intervalo'] ?? '30')
    return [15, 30, 60].includes(v) ? v : 30
  }, [settings])

  const mostrarFestivos = settings['agenda_mostrar_festivos'] !== 'false'

  function toggleFiltro(key: string) {
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
      title: buildAppointmentDisplayTitle(apt),
      start: new Date(apt.fecha_inicio),
      end:   apt.fecha_fin
        ? new Date(apt.fecha_fin)
        : new Date(new Date(apt.fecha_inicio).getTime() + 60 * 60 * 1000),
      resource: apt,
    }))

  const consultorioFilterOptions = useMemo(
    () => buildConsultorioFilterOptions(consultorios, appointments, settings),
    [appointments, consultorios, settings]
  )

  // Aplicar filtro de modalidad — si no hay filtros activos, se muestran todos
  const visibleEvents = useMemo(() =>
    filtrosActivos.size === 0
      ? events
      : events.filter((evt) => {
          const filterKey = resolveAppointmentConsultorioFilterKey(evt.resource, consultorios)
          return filterKey ? filtrosActivos.has(filterKey) : false
        }),
    [consultorios, events, filtrosActivos]
  )
  const visibleAppointments = useMemo(
    () => visibleEvents.map((event) => event.resource),
    [visibleEvents]
  )
  const calendarEventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => (
      <EventoCalendario event={event} settings={settings} consultorios={consultorios} />
    ),
    [consultorios, settings]
  )

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedAppointment(event.resource)
  }, [])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setNewSlotStart(slotInfo.start)
  }, [])

  // Fondo del evento: color de categoría
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const isSoftPast = event.resource.estado_sesion === 'realizada' && getAppointmentEnd(event.resource) <= new Date()
    const backgroundColor = event.resource.event_type === 'general' && event.resource.color
      ? event.resource.color
      : resolveAppointmentVisualConfig(event.resource, consultorios, settings).bg
    return {
      style: {
        backgroundColor,
        borderRadius: '10px',
        border: '1px solid rgba(255,250,248,0.18)',
        color: '#fffaf8',
        padding: '4px 8px 7px',
        boxShadow: isSoftPast
          ? '0 3px 10px rgba(60,50,70,0.10)'
          : '0 6px 18px rgba(60,50,70,0.16)',
        opacity: isSoftPast ? 0.82 : 1,
        filter: isSoftPast ? 'saturate(85%)' : 'none',
      }
    }
  }, [consultorios, settings])

  // Fondo de cada día: festivos (tinte muy sutil) + fines de semana (mauve apenas perceptible)
  const dayPropGetter = useCallback((date: Date) => {
    const dow = date.getDay()
    const isFestivo = mostrarFestivos && FESTIVOS_CO.has(toDateKey(date))
    const isWeekend = dow === 0 || dow === 6
    if (isFestivo) return { style: { background: 'rgba(185,143,149,0.07)' } }
    if (isWeekend) return { style: { background: 'rgba(175,175,210,0.05)' } }
    return {}
  }, [mostrarFestivos])

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
    <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
      {/* ── Barra superior — desktop ── */}
      <div className="hidden lg:flex glass-cool rounded-[18px] px-4 py-2.5 items-center gap-3 flex-wrap">

        {/* Navegación + período + indicadores */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button onClick={() => navegar('prev')} aria-label="Período anterior" className="btn-subtle p-2 shrink-0">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => navegar('next')} aria-label="Período siguiente" className="btn-subtle p-2 shrink-0">
            <ChevronRight size={15} />
          </button>
          <h2 className="editorial-panel-title ml-1 truncate capitalize text-[1.05rem]">
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
                className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                style={currentView === v
                  ? { background: 'rgba(255,255,255,0.92)', color: 'var(--ink-cool-strong)', boxShadow: 'var(--shadow-glass)' }
                  : { color: 'var(--ink-cool-faint)', background: 'transparent' }
                }
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <button onClick={() => navegar('today')} className="btn-subtle px-3 py-1.5 text-[13px]">
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

      {/* ── Barra superior — mobile + tablet ── */}
      <div className="flex lg:hidden glass-cool rounded-[18px] px-3 py-2 sm:px-4 sm:py-2.5 flex-col gap-2 sm:gap-2.5">
        {/* Fila 1: nav + período + pills sm+ */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button onClick={() => navegar('prev')} aria-label="Período anterior" className="btn-subtle p-1.5 sm:p-2 shrink-0">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => navegar('next')} aria-label="Período siguiente" className="btn-subtle p-1.5 sm:p-2 shrink-0">
            <ChevronRight size={13} />
          </button>
          <h2 className="editorial-panel-title ml-0.5 sm:ml-1 flex-1 truncate capitalize text-[0.92rem] sm:text-[1.05rem]">
            {periodoLabel()}
          </h2>
          {todayCount > 0 && (
            <span
              className="hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0 text-[12px] font-medium whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.46)', border: '1px solid var(--border-glass-white)', color: 'var(--ink-cool-soft)' }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9488B0', display: 'inline-block', flexShrink: 0 }} />
              {todayCount} hoy
            </span>
          )}
          {pendingCount > 0 && (
            <span
              className="hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0 text-[12px] font-medium whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.46)', border: '1px solid var(--border-glass-white)', color: 'var(--ink-cool-soft)' }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#B79B96', display: 'inline-block', flexShrink: 0 }} />
              {pendingCount} por confirmar
            </span>
          )}
        </div>
        {/* Fila 2: tabs de vista + pills-xs + Hoy + nueva cita */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex gap-0.5 p-0.5 sm:p-1 rounded-full shrink-0" style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-glass-white)' }}>
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-all shrink-0"
                style={currentView === v
                  ? { background: 'rgba(255,255,255,0.92)', color: 'var(--ink-cool-strong)', boxShadow: 'var(--shadow-glass)' }
                  : { color: 'var(--ink-cool-faint)', background: 'transparent' }
                }
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          {todayCount > 0 && (
            <span className="sm:hidden text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(148,136,176,0.16)', color: 'var(--ink-cool-soft)' }}>
              {todayCount} hoy
            </span>
          )}
          {pendingCount > 0 && (
            <span className="sm:hidden text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(185,143,149,0.14)', color: 'var(--ink-cool-soft)' }}>
              {pendingCount} por confirmar
            </span>
          )}
          <div className="flex-1" />
          <button onClick={() => navegar('today')} className="btn-subtle px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-[13px] shrink-0">
            Hoy
          </button>
          <button
            onClick={() => setNewSlotStart(new Date())}
            aria-label="Nueva cita"
            className="btn-action p-1.5 sm:p-2 shrink-0"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* ── Filtros de consultorio — desktop ── */}
      <div className="hidden lg:flex items-center gap-2 px-1">
        <ConsultorioFilterBar
          options={consultorioFilterOptions}
          filtrosActivos={filtrosActivos}
          onToggle={toggleFiltro}
          onClear={() => setFiltrosActivos(new Set())}
        />
      </div>

      {/* ── Filtros de consultorio — mobile + tablet ── */}
      <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 px-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <ConsultorioFilterBar
          options={consultorioFilterOptions}
          filtrosActivos={filtrosActivos}
          onToggle={toggleFiltro}
          onClear={() => setFiltrosActivos(new Set())}
          compact
        />
      </div>

      {/* ── Calendario desktop ── */}
      <div className="hidden lg:block glass-cool rounded-[22px] overflow-hidden">
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
            // react-big-calendar v1.x doesn't type custom component overrides for dateHeader/header;
            // `as any` is the documented workaround until upstream fixes the generic constraints.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            components={{ event: calendarEventComponent, dateHeader: CabechaFecha, header: ColumnaHeader } as any}
            min={calMin}
            max={calMax}
            step={calStep}
            timeslots={Math.max(1, 60 / calStep)}
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

      {/* ── Agenda mobile ── */}
      <div className="block lg:hidden">
        {currentView === 'week' ? (
          <MobileAgenda
            appointments={visibleAppointments}
            consultorios={consultorios}
            currentDate={currentDate}
            settings={settings}
            onSelectAppointment={setSelectedAppointment}
            onNewSlot={setNewSlotStart}
          />
        ) : (
          <div className="glass-cool rounded-[18px] md:rounded-[22px] overflow-hidden">
            <div
              className={`p-3 sm:p-4 md:p-5 ${currentView === 'month' ? 'h-[620px] md:h-[680px]' : 'h-[720px] md:h-[780px]'}`}
            >
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
                // react-big-calendar v1.x doesn't type custom component overrides for dateHeader/header;
                // `as any` is the documented workaround until upstream fixes the generic constraints.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                components={{ event: calendarEventComponent, dateHeader: CabechaFecha, header: ColumnaHeader } as any}
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
        )}
      </div>

      {/* Modal al tocar una cita existente */}
      {selectedAppointment && (
            <AppointmentModal
              appointment={selectedAppointment}
              appointments={appointments}
              consultorios={consultorios}
              settings={settings}
              onClose={() => setSelectedAppointment(null)}
            />
      )}

      {/* Modal para crear una cita nueva */}
      {newSlotStart && (
            <NewAppointmentModal
              appointments={appointments}
              consultorios={consultorios}
              defaultStart={newSlotStart}
              settings={settings}
              onClose={() => setNewSlotStart(null)}
        />
      )}
    </div>
  )
}
