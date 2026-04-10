'use client'
// ============================================================
// MOBILE AGENDA — vista semanal optimizada para mobile/tablet
//
// Patrón Google Calendar mobile:
//   • Componente de altura fija — no empuja el layout de página
//   • Cabecera de días fija (no desplaza verticalmente)
//   • Grilla horaria con scroll vertical interno
//   • Scroll horizontal para recorrer los 7 días de la semana
//   • Auto-scroll al momento actual al montar
//   • Slots más altos para mejor legibilidad y tap targets
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import moment from 'moment-timezone'
import {
  AlertTriangle,
  Briefcase,
  Check,
  CircleDollarSign,
  Clock3,
  HandCoins,
} from 'lucide-react'
import type { Appointment, Consultorio } from '@/types'
import {
  appointmentNeedsAttention,
  isAppointmentConfirmed,
  isAppointmentPaid,
  resolveAppointmentVisualConfig,
} from '@/lib/appointment-ui'
import { buildAppointmentDisplayTitle, getAppointmentEnd } from '@/lib/appointments'
import type { SettingsMap } from '@/lib/settings'
import { FESTIVOS_CO } from './festivos'

interface MobileAgendaProps {
  appointments: Appointment[]
  consultorios: Consultorio[]
  currentDate: Date
  settings: SettingsMap
  onSelectAppointment: (apt: Appointment) => void
  onNewSlot: (date: Date) => void
}

interface PositionedAppointment {
  apt: Appointment
  top: number
  height: number
  lane: number
  laneCount: number
}

interface MobileAgendaLayout {
  visibleDays: number
  dayGap: number
  dayColumnWidth: number
  slotHeight: number
  timeGutterWidth: number
  headerHeight: number
  gridHeight: number
  componentHeight: number
  titleSize: number
  metaSize: number
  iconSize: number
  cardPaddingX: number
  cardPaddingY: number
  badgeSize: number
  eventRadius: number
  eventMinHeight: number
  headerGap: number
  outerGap: number
  // debug
  shortSide: number
  isTablet: boolean
}

// ── Debug overlay — set true para medir en dispositivo real, false para producción
const LAYOUT_DEBUG = true

const START_HOUR = 8
const END_HOUR = 21
const SLOT_MINUTES = 30
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const SLOT_COUNT = TOTAL_MINUTES / SLOT_MINUTES
const OVERLAP_GAP_PX = 3
const MIN_DAY_WIDTH = 96

function interpolate(min: number, max: number, ratio: number) {
  return min + (max - min) * ratio
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

function toDateKey(date: Date): string {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  )
}

function clampMinutes(minutes: number) {
  return Math.max(0, Math.min(minutes, TOTAL_MINUTES))
}

function minutesFromGridStart(date: Date) {
  return (date.getHours() - START_HOUR) * 60 + date.getMinutes()
}

function buildDefaultSlot(day: Date, minutesFromStart = 60) {
  const next = new Date(day)
  const safeMinutes = Math.max(0, Math.min(minutesFromStart, TOTAL_MINUTES - SLOT_MINUTES))
  next.setHours(
    START_HOUR + Math.floor(safeMinutes / 60),
    safeMinutes % 60,
    0,
    0
  )
  return next
}

function buildSuggestedSlot(day: Date, now: Date) {
  const isToday = moment(day).isSame(moment(now), 'day')
  if (!isToday) return buildDefaultSlot(day, 60)

  const roundedMinutes = Math.ceil((minutesFromGridStart(now) + 1) / SLOT_MINUTES) * SLOT_MINUTES
  return buildDefaultSlot(day, roundedMinutes)
}

function layoutDayAppointments(
  appointments: Appointment[],
  slotHeight: number,
  eventMinHeight: number
): PositionedAppointment[] {
  const normalized = appointments
    .map((apt) => {
      const startMinutes = clampMinutes(minutesFromGridStart(new Date(apt.fecha_inicio)))
      const endMinutes = clampMinutes(minutesFromGridStart(getAppointmentEnd(apt)))

      if (endMinutes <= 0 || startMinutes >= TOTAL_MINUTES) return null

      return {
        apt,
        startMinutes,
        endMinutes: Math.max(endMinutes, startMinutes + SLOT_MINUTES),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)

  const groups: typeof normalized[] = []
  let currentGroup: typeof normalized = []
  let currentGroupEnd = -1

  normalized.forEach((entry) => {
    if (currentGroup.length === 0 || entry.startMinutes < currentGroupEnd) {
      currentGroup.push(entry)
      currentGroupEnd = Math.max(currentGroupEnd, entry.endMinutes)
      return
    }

    groups.push(currentGroup)
    currentGroup = [entry]
    currentGroupEnd = entry.endMinutes
  })

  if (currentGroup.length > 0) groups.push(currentGroup)

  return groups.flatMap((group) => {
    const laneEnds: number[] = []
    const entries = group.map((entry) => {
      let lane = laneEnds.findIndex((end) => end <= entry.startMinutes)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(entry.endMinutes)
      } else {
        laneEnds[lane] = entry.endMinutes
      }
      return { entry, lane }
    })

    const laneCount = Math.max(laneEnds.length, 1)

    return entries.map(({ entry, lane }) => ({
      apt: entry.apt,
      top: (entry.startMinutes / SLOT_MINUTES) * slotHeight + 2,
      height: Math.max(
        ((entry.endMinutes - entry.startMinutes) / SLOT_MINUTES) * slotHeight - 4,
        eventMinHeight
      ),
      lane,
      laneCount,
    }))
  })
}

function EventCard({
  apt,
  lane,
  laneCount,
  top,
  height,
  layout,
  settings,
  consultorios,
  onClick,
}: PositionedAppointment & {
  layout: MobileAgendaLayout
  settings: SettingsMap
  consultorios: Consultorio[]
  onClick: () => void
}) {
  const { Icon, bg } = resolveAppointmentVisualConfig(apt, consultorios, settings)
  const isConfirmed = isAppointmentConfirmed(apt)
  const isPaid = isAppointmentPaid(apt)
  const needsAction = appointmentNeedsAttention(apt)
  const isSoftPast =
    apt.estado_sesion === 'realizada' && getAppointmentEnd(apt) <= new Date()

  const start = new Date(apt.fecha_inicio)
  const end = getAppointmentEnd(apt)
  const bgColor = apt.event_type === 'general' && apt.color ? apt.color : bg
  const isTiny = height <= layout.eventMinHeight
  const isCompact = height <= layout.eventMinHeight + 10
  const titleClamp = isTiny ? 1 : isCompact ? 2 : 3
  const topMetaVisible = height > layout.eventMinHeight + 4
  const badgeRowMarginTop = isTiny ? 2 : 4

  const widthStyle =
    laneCount === 1
      ? 'calc(100% - 4px)'
      : `calc(${100 / laneCount}% - ${
          ((laneCount - 1) * OVERLAP_GAP_PX) / laneCount + 4
        }px)`
  const leftStyle =
    laneCount === 1
      ? '2px'
      : `calc(${(100 / laneCount) * lane}% + ${lane * OVERLAP_GAP_PX + 2}px)`

  return (
    <button
      type="button"
      data-event-card="true"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className="absolute text-left"
      style={{
        top,
        left: leftStyle,
        width: widthStyle,
        height,
      }}
    >
      <div
        className="h-full"
        style={{
          padding: `${layout.cardPaddingY}px ${layout.cardPaddingX}px`,
          borderRadius: `${layout.eventRadius}px`,
          background: bgColor,
          opacity: isSoftPast ? 0.8 : 1,
          filter: isSoftPast ? 'saturate(80%)' : 'none',
          boxShadow: '0 2px 8px rgba(60,50,70,0.12)',
          overflow: 'hidden',
        }}
      >
        {topMetaVisible && (
          <p
            style={{
              fontSize: `${layout.metaSize}px`,
              color: 'rgba(255,255,255,0.82)',
              lineHeight: 1.1,
              marginBottom: '2px',
            }}
          >
            {formatTime(start)}
            {apt.event_type !== 'general' ? ` - ${formatTime(end)}` : ''}
          </p>
        )}
        <p
          className="font-semibold"
          style={{
            fontSize: `${layout.titleSize}px`,
            color: 'white',
            lineHeight: 1.15,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: titleClamp,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {buildAppointmentDisplayTitle(apt)}
        </p>
        <div
          className="flex items-center gap-1.5"
          style={{
            marginTop: `${badgeRowMarginTop}px`,
            minHeight: `${layout.badgeSize}px`,
            gap: `${isTiny ? 4 : 5}px`,
          }}
        >
          {apt.event_type === 'general' ? (
            <Briefcase
              size={layout.iconSize}
              style={{ color: 'rgba(255,255,255,0.9)', flexShrink: 0 }}
            />
          ) : (
            Icon && (
              <Icon
                size={layout.iconSize}
                style={{ color: 'rgba(255,255,255,0.9)', flexShrink: 0 }}
              />
            )
          )}
          {apt.event_type !== 'general' && (
            <>
              {isConfirmed ? (
                <Check
                  size={layout.iconSize}
                  style={{ color: 'rgba(255,255,255,0.92)', flexShrink: 0 }}
                />
              ) : (
                <Clock3
                  size={layout.iconSize}
                  style={{ color: 'rgba(255,242,235,0.82)', flexShrink: 0 }}
                />
              )}
              {isPaid ? (
                <CircleDollarSign
                  size={layout.iconSize}
                  style={{ color: 'rgba(255,255,255,0.92)', flexShrink: 0 }}
                />
              ) : (
                <HandCoins
                  size={layout.iconSize}
                  style={{ color: 'rgba(255,242,235,0.82)', flexShrink: 0 }}
                />
              )}
            </>
          )}
          {needsAction && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: layout.badgeSize,
                height: layout.badgeSize,
                borderRadius: 999,
                background: 'rgba(255,247,240,0.92)',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={Math.max(layout.iconSize - 1, 9)} style={{ color: '#A85A3B' }} />
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// Columna de etiquetas horarias — no incluye espaciador de cabecera,
// se renderiza dentro del contenedor de scroll vertical.
function HourGutter({
  slotHeight,
  timeGutterWidth,
  metaSize,
  gridHeight,
}: Pick<MobileAgendaLayout, 'slotHeight' | 'timeGutterWidth' | 'metaSize' | 'gridHeight'>) {
  return (
    <div className="shrink-0" style={{ width: timeGutterWidth, height: gridHeight }}>
      <div className="relative h-full">
        {Array.from({ length: SLOT_COUNT }).map((_, index) => {
          const hour = START_HOUR + Math.floor(index / 2)
          const isHourMark = index % 2 === 0

          return (
            <div
              key={`hour-${hour}-${index}`}
              className="flex items-start justify-end pr-1.5"
              style={{
                height: slotHeight,
                color: isHourMark ? 'var(--ink-cool-muted)' : 'transparent',
                fontSize: `${metaSize}px`,
                lineHeight: 1,
              }}
            >
              {isHourMark ? `${String(hour).padStart(2, '0')}:00` : '00:30'}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MobileAgenda({
  appointments,
  consultorios,
  currentDate,
  settings,
  onSelectAppointment,
  onNewSlot,
}: MobileAgendaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)       // scroll horizontal de columnas
  const headerScrollRef = useRef<HTMLDivElement>(null) // scroll horizontal de cabeceras (sincronizado)
  const gridScrollRef = useRef<HTMLDivElement>(null)   // scroll vertical de la grilla
  const viewportRef = useRef<HTMLDivElement>(null)     // medición de ancho disponible
  const lastScrollKeyRef = useRef<string>('')
  const didScrollToNow = useRef(false)
  const today = useMemo(() => new Date(), [])
  const [viewportWidth, setViewportWidth] = useState(0)
  // window.innerWidth/Height — usados para clasificar phone vs tablet.
  // Separados de viewportWidth (medición del div interno) que sirve solo
  // para calcular anchos de columnas disponibles.
  const [windowWidth, setWindowWidth] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)

  const weekDays = useMemo(() => {
    const start = moment(currentDate).startOf('week')
    return Array.from({ length: 7 }, (_, index) =>
      start.clone().add(index, 'days').toDate()
    )
  }, [currentDate])

  const appointmentsByDay = useMemo(() => {
    return weekDays.map((day) =>
      appointments
        .filter((apt) => {
          if (apt.estado_sesion === 'cancelo') return false
          return moment(apt.fecha_inicio).isSame(moment(day), 'day')
        })
        .sort(
          (a, b) =>
            new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
        )
    )
  }, [appointments, weekDays])

  const layout = useMemo<MobileAgendaLayout>(() => {
    const width = Math.max(viewportWidth, 320)
    const screenH = windowHeight > 0 ? windowHeight : 0

    // ── Clasificación phone vs tablet ─────────────────────────────
    // Usamos el lado CORTO del dispositivo (min de ancho/alto de la ventana).
    // Esto evita que iPhone 11 en landscape (896px de ancho) sea clasificado
    // como tablet — su lado corto es 414px, bien bajo el umbral.
    // Umbral 600px: dimensión corta de la tablet más pequeña relevante (7").
    const shortSide = windowWidth > 0
      ? Math.min(windowWidth, windowHeight > 0 ? windowHeight : windowWidth)
      : Math.min(width, screenH > 0 ? screenH : width)
    const isTablet = shortSide >= 600

    // Curvas independientes por clase de dispositivo
    const phoneRatio  = isTablet ? 0 : Math.max(0, Math.min((width - 320) / 320, 1))
    const tabletRatio = isTablet ? Math.max(0, Math.min((width - 640) / 360, 1)) : 0

    const visibleDays = 4

    // ── Cabecera de día ───────────────────────────────────────────
    const headerHeight = isTablet
      ? Math.round(interpolate(68, 82, tabletRatio))
      : Math.round(interpolate(38, 44, phoneRatio))

    // ── Gutter de horas ───────────────────────────────────────────
    const timeGutterWidth = isTablet
      ? Math.round(interpolate(46, 56, tabletRatio))
      : Math.round(interpolate(22, 28, phoneRatio))

    // ── Tipografía ────────────────────────────────────────────────
    const metaSize = isTablet
      ? Math.round(interpolate(12, 14, tabletRatio))
      : Math.round(interpolate(10, 11, phoneRatio))
    const titleSize = isTablet
      ? Math.round(interpolate(14, 16, tabletRatio))
      : Math.round(interpolate(10, 11, phoneRatio))
    const iconSize = isTablet
      ? Math.round(interpolate(11, 13, tabletRatio))
      : Math.round(interpolate(8, 9, phoneRatio))

    // ── Dimensiones de tarjeta ────────────────────────────────────
    const cardPaddingX = isTablet
      ? Math.round(interpolate(10, 14, tabletRatio))
      : Math.round(interpolate(4, 6, phoneRatio))
    const cardPaddingY = isTablet
      ? Math.round(interpolate(8, 10, tabletRatio))
      : Math.round(interpolate(3, 4, phoneRatio))
    const badgeSize = isTablet
      ? Math.round(interpolate(18, 22, tabletRatio))
      : Math.round(interpolate(12, 14, phoneRatio))
    const eventRadius = isTablet
      ? Math.round(interpolate(12, 14, tabletRatio))
      : Math.round(interpolate(8, 10, phoneRatio))

    // ── Espaciado ─────────────────────────────────────────────────
    const dayGap = isTablet
      ? Math.round(interpolate(8, 10, tabletRatio))
      : Math.round(interpolate(3, 5, phoneRatio))
    const headerGap = isTablet
      ? Math.round(interpolate(6, 8, tabletRatio))
      : Math.round(interpolate(4, 6, phoneRatio))
    const outerGap = isTablet
      ? Math.round(interpolate(8, 10, tabletRatio))
      : Math.round(interpolate(4, 6, phoneRatio))

    // innerPad replica el cálculo de `p` en el render: Math.max(outerGap, 4)
    const innerPad = Math.max(outerGap, 4)

    // ── Altura del componente ─────────────────────────────────────
    // Usa window.innerHeight para ocupar el espacio real de pantalla.
    // Tablet: ratio 16/22 (objetivo 16cm visibles de 22cm físicos).
    // Phone: pantalla menos el chrome de la app (~200px medido).
    const componentHeight = screenH > 0
      ? isTablet
        ? Math.round(Math.min(960, Math.max(560, screenH * (16 / 22))))
        : Math.min(700, Math.max(400, screenH - 200))
      : isTablet ? 640 : 420

    // ── Altura de slot ────────────────────────────────────────────
    // Ambos modos usan slots fijos y altos para que las cards de citas
    // tengan espacio suficiente para mostrar nombre + hora + iconos.
    // La grilla es más alta que el componente → scroll vertical interno.
    //
    // Phone: 32→36px — cita de 1h ocupa 64-72px (nombre + iconos caben).
    // Tablet: 44→52px — cita de 1h ocupa 88-104px, lectura cómoda.
    const slotHeight = isTablet
      ? Math.round(interpolate(44, 52, tabletRatio))
      : Math.round(interpolate(32, 36, phoneRatio))

    const eventMinHeight = isTablet
      ? Math.round(interpolate(56, 68, tabletRatio))
      : Math.round(interpolate(40, 46, phoneRatio))

    // ── Ancho de columnas ─────────────────────────────────────────
    // Phone: usa windowWidth (window.innerWidth real) para derivar el
    //   ancho disponible. El div interno (viewportRef) puede medir más que
    //   el viewport real debido a overflow, dando colW inflado artificialmente.
    // Tablet: usa viewportWidth del div (fiable en pantallas grandes).
    const availableColsW = !isTablet && windowWidth > 0
      ? windowWidth - 2 * innerPad - timeGutterWidth - outerGap
      : viewportWidth
    const rawDayWidth = (availableColsW - dayGap * (visibleDays - 1)) / visibleDays
    const dayColumnWidth = Math.max(MIN_DAY_WIDTH, Math.round(rawDayWidth))

    return {
      visibleDays,
      dayGap,
      dayColumnWidth,
      slotHeight,
      timeGutterWidth,
      headerHeight,
      gridHeight: SLOT_COUNT * slotHeight,
      componentHeight,
      titleSize,
      metaSize,
      iconSize,
      cardPaddingX,
      cardPaddingY,
      badgeSize,
      eventRadius,
      eventMinHeight,
      headerGap,
      outerGap,
      shortSide,
      isTablet,
    }
  }, [viewportWidth, windowWidth, windowHeight])

  // Observar ancho del viewport
  useEffect(() => {
    if (!viewportRef.current) return

    const node = viewportRef.current
    const updateWidth = () => setViewportWidth(node.clientWidth)

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  // Observar dimensiones de ventana para clasificación phone/tablet
  useEffect(() => {
    const update = () => {
      setWindowWidth(window.innerWidth)
      setWindowHeight(window.innerHeight)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Sincronizar scroll horizontal de cabeceras con la grilla
  useEffect(() => {
    const grid = scrollRef.current
    const header = headerScrollRef.current
    if (!grid || !header) return

    const sync = () => { header.scrollLeft = grid.scrollLeft }
    grid.addEventListener('scroll', sync, { passive: true })
    return () => grid.removeEventListener('scroll', sync)
  }, [])

  // Scroll al momento actual al montar (una sola vez)
  useEffect(() => {
    if (didScrollToNow.current || !gridScrollRef.current || layout.slotHeight === 0) return
    const now = new Date()
    const minutes = minutesFromGridStart(now)
    if (minutes <= 0) return
    const scrollTop = Math.max(0, (clampMinutes(minutes) / SLOT_MINUTES) * layout.slotHeight - 100)
    gridScrollRef.current.scrollTop = scrollTop
    didScrollToNow.current = true
  }, [layout.slotHeight])

  // Scroll horizontal al día activo
  useEffect(() => {
    if (!scrollRef.current) return

    const activeIndex = weekDays.findIndex((day) =>
      moment(day).isSame(moment(currentDate), 'day')
    )
    const safeIndex = activeIndex >= 0 ? activeIndex : 0
    const maxStartIndex = Math.max(weekDays.length - layout.visibleDays, 0)
    const targetStartIndex = Math.min(
      Math.max(safeIndex - Math.floor((layout.visibleDays - 1) / 2), 0),
      maxStartIndex
    )
    const scrollLeft = targetStartIndex * (layout.dayColumnWidth + layout.dayGap)
    const nextScrollKey = `${moment(currentDate).startOf('week').toISOString()}-${layout.visibleDays}`
    const behavior = lastScrollKeyRef.current === nextScrollKey ? 'auto' : 'smooth'

    scrollRef.current.scrollTo({ left: scrollLeft, behavior })
    lastScrollKeyRef.current = nextScrollKey
  }, [currentDate, layout.dayColumnWidth, layout.dayGap, layout.visibleDays, weekDays])

  const handleGridClick = (day: Date, event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const slotIndex = Math.max(
      0,
      Math.min(SLOT_COUNT - 1, Math.floor(offsetY / layout.slotHeight))
    )
    onNewSlot(buildDefaultSlot(day, slotIndex * SLOT_MINUTES))
  }

  const p = Math.max(layout.outerGap, 4)

  const scrollContentStyle: CSSProperties = {
    width: weekDays.length * layout.dayColumnWidth + layout.dayGap * (weekDays.length - 1),
  }

  return (
    <div
      className="glass-cool rounded-[18px] md:rounded-[22px]"
      style={{ height: layout.componentHeight, padding: p }}
    >
      {LAYOUT_DEBUG && (
        <div style={{
          position: 'absolute', top: 4, left: 4, zIndex: 9999,
          background: 'rgba(0,0,0,0.82)', color: '#0ff', fontSize: 10,
          padding: '4px 7px', borderRadius: 6, lineHeight: 1.6,
          pointerEvents: 'none', fontFamily: 'monospace',
        }}>
          win {windowHeight}×{windowWidth}<br/>
          vvp {typeof window !== 'undefined' ? `${window.visualViewport?.height ?? '?'}×${window.visualViewport?.width ?? '?'}` : 'ssr'}<br/>
          short={layout.shortSide} tab={layout.isTablet ? 'Y' : 'N'}<br/>
          compH={layout.componentHeight} slot={layout.slotHeight}<br/>
          days={layout.visibleDays} colW={layout.dayColumnWidth}<br/>
          gutter={layout.timeGutterWidth} hdrH={layout.headerHeight}
        </div>
      )}
      <div className="flex flex-col h-full" style={{ gap: layout.headerGap }}>

        {/* ── Cabecera de días — fija, no desplaza verticalmente ── */}
        <div className="shrink-0 flex items-start" style={{ gap: layout.outerGap }}>
          {/* Espaciador alineado con el gutter de horas */}
          <div style={{ width: layout.timeGutterWidth, flexShrink: 0 }} />
          {/* Botones de día — scroll horizontal sincronizado con la grilla */}
          <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
            <div
              ref={headerScrollRef}
              style={{ overflowX: 'hidden', scrollbarWidth: 'none' }}
            >
              <div style={scrollContentStyle}>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(7, ${layout.dayColumnWidth}px)`,
                    columnGap: `${layout.dayGap}px`,
                  }}
                >
                  {weekDays.map((day) => {
                    const isToday = moment(day).isSame(moment(today), 'day')
                    const isFestivo = FESTIVOS_CO.has(toDateKey(day))
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6

                    return (
                      <button
                        key={`header-${day.toISOString()}`}
                        type="button"
                        onClick={() => onNewSlot(buildSuggestedSlot(day, today))}
                        className="text-center"
                        style={{
                          scrollSnapAlign: 'start',
                          height: layout.headerHeight,
                          borderRadius: `${Math.max(layout.eventRadius + 1, 9)}px`,
                          padding: `${Math.max(layout.cardPaddingY - 1, 3)}px ${Math.max(layout.cardPaddingX, 5)}px`,
                          background: isToday
                            ? 'rgba(148,136,176,0.18)'
                            : isFestivo
                              ? 'rgba(185,143,149,0.12)'
                              : 'rgba(255,255,255,0.32)',
                          border: isToday
                            ? '1px solid rgba(148,136,176,0.3)'
                            : '1px solid rgba(255,255,255,0.34)',
                        }}
                      >
                        <p
                          className="font-semibold uppercase"
                          style={{
                            fontSize: `${layout.metaSize}px`,
                            color: 'var(--ink-cool-faint)',
                            letterSpacing: '0.08em',
                            marginBottom: '1px',
                          }}
                        >
                          {moment(day).format('ddd').replace('.', '')}
                        </p>
                        <div className="flex items-center justify-center gap-1">
                          <p
                            className="font-semibold"
                            style={{
                              fontSize: `${layout.titleSize + 3}px`,
                              color: isToday
                                ? '#9488B0'
                                : isWeekend
                                  ? 'var(--ink-cool-soft)'
                                  : 'var(--ink-cool-strong)',
                              lineHeight: 1,
                            }}
                          >
                            {moment(day).format('D')}
                          </p>
                          {isFestivo && (
                            <span
                              className="font-medium uppercase"
                              style={{
                                fontSize: `${layout.metaSize}px`,
                                color: 'var(--ink-cool-faint)',
                              }}
                            >
                              Fest
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grilla horaria — scroll vertical + horizontal ── */}
        <div
          ref={gridScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <div
            className="flex items-start"
            style={{ height: layout.gridHeight, gap: layout.outerGap }}
          >
            {/* Etiquetas de hora — desplazan con la grilla verticalmente */}
            <HourGutter
              slotHeight={layout.slotHeight}
              timeGutterWidth={layout.timeGutterWidth}
              metaSize={layout.metaSize}
              gridHeight={layout.gridHeight}
            />

            {/* Columnas de días — scroll horizontal */}
            <div className="min-w-0 flex-1 overflow-hidden" style={{ height: layout.gridHeight }}>
              <div
                ref={scrollRef}
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  height: layout.gridHeight,
                  scrollSnapType: 'x proximity',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  overscrollBehaviorX: 'contain',
                }}
              >
                <div style={{ ...scrollContentStyle, height: layout.gridHeight }}>
                  <div
                    className="grid h-full"
                    style={{
                      gridTemplateColumns: `repeat(7, ${layout.dayColumnWidth}px)`,
                      columnGap: `${layout.dayGap}px`,
                    }}
                  >
                    {weekDays.map((day, dayIndex) => {
                      const isToday = moment(day).isSame(moment(today), 'day')
                      const currentMinutes = minutesFromGridStart(today)
                      const currentTimeVisible =
                        isToday && currentMinutes >= 0 && currentMinutes <= TOTAL_MINUTES
                      const positionedAppointments = layoutDayAppointments(
                        appointmentsByDay[dayIndex] ?? [],
                        layout.slotHeight,
                        layout.eventMinHeight
                      )

                      return (
                        <div
                          key={day.toISOString()}
                          className="relative overflow-hidden"
                          style={{
                            scrollSnapAlign: 'start',
                            borderRadius: `${Math.max(layout.eventRadius + 1, 9)}px`,
                            height: layout.gridHeight,
                            background: 'rgba(255,255,255,0.26)',
                            border: '1px solid rgba(255,255,255,0.34)',
                          }}
                          onClick={(event) => handleGridClick(day, event)}
                        >
                          <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: SLOT_COUNT }).map((_, index) => (
                              <div
                                key={`slot-${day.toISOString()}-${index}`}
                                style={{
                                  height: layout.slotHeight,
                                  borderTop:
                                    index % 2 === 0
                                      ? '1px solid rgba(185,174,189,0.18)'
                                      : '1px dashed rgba(185,174,189,0.1)',
                                  background:
                                    index % 2 === 0
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'transparent',
                                }}
                              />
                            ))}
                          </div>

                          {currentTimeVisible && (
                            <div
                              className="absolute left-0 right-0 pointer-events-none"
                              style={{
                                top:
                                  (clampMinutes(currentMinutes) / SLOT_MINUTES) *
                                    layout.slotHeight - 1,
                                borderTop: '2px solid #9488B0',
                                opacity: 0.6,
                              }}
                            />
                          )}

                          {positionedAppointments.map((positioned) => (
                            <EventCard
                              key={positioned.apt.id}
                              {...positioned}
                              layout={layout}
                              settings={settings}
                              consultorios={consultorios}
                              onClick={() => onSelectAppointment(positioned.apt)}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
