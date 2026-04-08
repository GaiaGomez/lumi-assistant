'use client'
// ============================================================
// MOBILE AGENDA — vista semanal optimizada para mobile
// Mantiene una grilla horaria real con 3 a 5 días visibles y
// scroll horizontal para recorrer la semana completa.
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
}

const START_HOUR = 8
const END_HOUR = 21
const SLOT_MINUTES = 30
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const SLOT_COUNT = TOTAL_MINUTES / SLOT_MINUTES
const OVERLAP_GAP_PX = 3
const MIN_DAY_WIDTH = 90

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
  slotHeight: number
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
        Math.max(slotHeight - 6, 18)
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
  const isTiny = height <= layout.eventMinHeight + 2
  const isCompact = height <= layout.slotHeight + 10
  const titleClamp = isTiny ? 1 : isCompact ? 2 : 3
  const topMetaVisible = !isTiny
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

function HourGutter({
  slotHeight,
  headerHeight,
  timeGutterWidth,
  metaSize,
  gridHeight,
}: Pick<
  MobileAgendaLayout,
  'slotHeight' | 'headerHeight' | 'timeGutterWidth' | 'metaSize' | 'gridHeight'
>) {
  return (
    <div className="shrink-0" style={{ width: timeGutterWidth }}>
      <div style={{ height: headerHeight }} />
      <div className="relative" style={{ height: gridHeight }}>
        {Array.from({ length: SLOT_COUNT }).map((_, index) => {
          const hour = START_HOUR + Math.floor(index / 2)
          const isHourMark = index % 2 === 0

          return (
            <div
              key={`hour-${hour}-${index}`}
              className="flex items-start justify-end pr-1.5"
              style={{
                height: slotHeight,
                color: isHourMark
                  ? 'var(--ink-cool-muted)'
                  : 'transparent',
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lastScrollKeyRef = useRef<string>('')
  const today = useMemo(() => new Date(), [])
  const [viewportWidth, setViewportWidth] = useState(0)

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
    // isTablet: viewportWidth ≥ 640 (≈ iPad Mini portrait and up)
    const isTablet = width >= 640

    // Independent ratio curves per device class — phone values don't bleed into tablet
    // Phone: 0→1 across 320→640px  |  Tablet: 0→1 across 640→1000px
    const phoneRatio  = isTablet ? 0 : Math.max(0, Math.min((width - 320) / 320, 1))
    const tabletRatio = isTablet ? Math.max(0, Math.min((width - 640) / 360, 1)) : 0

    // Phone: always 3 days (compact, predictable)
    // Tablet: 4 days (wider columns, better legibility)
    const visibleDays = isTablet ? 4 : 3

    // ── Slot height ─────────────────────────────────────────────
    // Phone: 18→22px  (compact grid, less vertical mass)
    // Tablet: 52→64px (spacious, close to desktop scale)
    const slotHeight = isTablet
      ? Math.round(interpolate(52, 64, tabletRatio))
      : Math.round(interpolate(18, 22, phoneRatio))

    // ── Day header height ────────────────────────────────────────
    const headerHeight = isTablet
      ? Math.round(interpolate(64, 80, tabletRatio))
      : Math.round(interpolate(34, 42, phoneRatio))

    // ── Time gutter ──────────────────────────────────────────────
    const timeGutterWidth = isTablet
      ? Math.round(interpolate(44, 54, tabletRatio))
      : Math.round(interpolate(28, 34, phoneRatio))

    // ── Typography ───────────────────────────────────────────────
    // Phone: 9→10px meta, 11→12px title
    // Tablet: 11→13px meta, 14→16px title (matches Lumi's 14px body standard)
    const metaSize = isTablet
      ? Math.round(interpolate(11, 13, tabletRatio))
      : Math.round(interpolate(9, 10, phoneRatio))
    const titleSize = isTablet
      ? Math.round(interpolate(14, 16, tabletRatio))
      : Math.round(interpolate(11, 12, phoneRatio))
    const iconSize = isTablet
      ? Math.round(interpolate(11, 13, tabletRatio))
      : Math.round(interpolate(9, 10, phoneRatio))

    // ── Card dimensions ──────────────────────────────────────────
    const cardPaddingX = isTablet
      ? Math.round(interpolate(8, 12, tabletRatio))
      : Math.round(interpolate(4, 6, phoneRatio))
    const cardPaddingY = isTablet
      ? Math.round(interpolate(6, 9, tabletRatio))
      : Math.round(interpolate(3, 5, phoneRatio))
    const badgeSize = isTablet
      ? Math.round(interpolate(16, 20, tabletRatio))
      : Math.round(interpolate(12, 14, phoneRatio))
    const eventRadius = isTablet
      ? Math.round(interpolate(10, 14, tabletRatio))
      : Math.round(interpolate(7, 9, phoneRatio))
    const eventMinHeight = isTablet
      ? Math.round(interpolate(28, 36, tabletRatio))
      : Math.round(interpolate(16, 20, phoneRatio))

    // ── Gaps ─────────────────────────────────────────────────────
    const dayGap = isTablet
      ? Math.round(interpolate(8, 12, tabletRatio))
      : Math.round(interpolate(3, 5, phoneRatio))
    const headerGap = dayGap
    const outerGap = isTablet
      ? Math.round(interpolate(6, 10, tabletRatio))
      : Math.round(interpolate(3, 5, phoneRatio))

    const rawDayWidth = (width - dayGap * (visibleDays - 1)) / visibleDays
    const dayColumnWidth = Math.max(
      MIN_DAY_WIDTH,
      Math.min(isTablet ? 190 : 148, rawDayWidth)
    )

    return {
      visibleDays,
      dayGap,
      dayColumnWidth,
      slotHeight,
      timeGutterWidth,
      headerHeight,
      gridHeight: SLOT_COUNT * slotHeight,
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
    }
  }, [viewportWidth])

  useEffect(() => {
    if (!viewportRef.current) return

    const node = viewportRef.current
    const updateWidth = () => setViewportWidth(node.clientWidth)

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

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

  const scrollContentStyle: CSSProperties = {
    width:
      weekDays.length * layout.dayColumnWidth +
      layout.dayGap * (weekDays.length - 1),
  }

  return (
    <div
      className="glass-cool rounded-[18px] md:rounded-[22px]"
      style={{
        padding: `${Math.max(layout.outerGap, 4)}px ${Math.max(layout.outerGap, 4)}px ${Math.max(layout.outerGap + 1, 5)}px`,
      }}
    >
      <div className="flex items-start" style={{ gap: `${layout.outerGap}px` }}>
        <HourGutter
          slotHeight={layout.slotHeight}
          headerHeight={layout.headerHeight}
          timeGutterWidth={layout.timeGutterWidth}
          metaSize={layout.metaSize}
          gridHeight={layout.gridHeight}
        />

        <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="overflow-x-auto"
            style={{
              scrollSnapType: 'x proximity',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              overscrollBehaviorX: 'contain',
            }}
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
                            fontSize: `${layout.titleSize + 4}px`,
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

              <div
                className="grid"
                style={{
                  marginTop: `${layout.headerGap}px`,
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
                    layout.slotHeight
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
                                layout.slotHeight -
                              1,
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
  )
}
