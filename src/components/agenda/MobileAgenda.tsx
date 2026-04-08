'use client'
// ============================================================
// MOBILE AGENDA — vista semanal optimizada para mobile
// Mantiene una grilla horaria real con 3 días visibles y
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
import type { Appointment } from '@/types'
import {
  APPOINTMENT_CATEGORY_CONFIG,
  appointmentNeedsAttention,
  isAppointmentConfirmed,
  isAppointmentPaid,
  resolveAppointmentCategory,
} from '@/lib/appointment-ui'
import { buildAppointmentDisplayTitle, getAppointmentEnd } from '@/lib/appointments'
import { FESTIVOS_CO } from './festivos'

interface MobileAgendaProps {
  appointments: Appointment[]
  currentDate: Date
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
}

const START_HOUR = 8
const END_HOUR = 21
const SLOT_MINUTES = 30
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const SLOT_COUNT = TOTAL_MINUTES / SLOT_MINUTES
const OVERLAP_GAP_PX = 4
const MIN_VISIBLE_DAYS = 3
const MAX_VISIBLE_DAYS = 5
const MIN_DAY_WIDTH = 104
const MAX_DAY_WIDTH = 152

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
        slotHeight - 8
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
  onClick,
}: PositionedAppointment & {
  layout: MobileAgendaLayout
  onClick: () => void
}) {
  const category = resolveAppointmentCategory(apt)
  const { Icon, bg } = APPOINTMENT_CATEGORY_CONFIG[category]
  const isConfirmed = isAppointmentConfirmed(apt)
  const isPaid = isAppointmentPaid(apt)
  const needsAction = appointmentNeedsAttention(apt)
  const isSoftPast =
    apt.estado_sesion === 'realizada' && getAppointmentEnd(apt) <= new Date()

  const start = new Date(apt.fecha_inicio)
  const end = getAppointmentEnd(apt)
  const bgColor = apt.event_type === 'general' && apt.color ? apt.color : bg

  const widthStyle =
    laneCount === 1
      ? 'calc(100% - 8px)'
      : `calc(${100 / laneCount}% - ${
          ((laneCount - 1) * OVERLAP_GAP_PX) / laneCount + 8
        }px)`
  const leftStyle =
    laneCount === 1
      ? '4px'
      : `calc(${(100 / laneCount) * lane}% + ${lane * OVERLAP_GAP_PX + 4}px)`

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
        className="h-full rounded-[14px]"
        style={{
          padding: `${layout.cardPaddingY}px ${layout.cardPaddingX}px`,
          background: bgColor,
          opacity: isSoftPast ? 0.8 : 1,
          filter: isSoftPast ? 'saturate(80%)' : 'none',
          boxShadow: '0 4px 12px rgba(60,50,70,0.14)',
          overflow: 'hidden',
        }}
      >
        <p
          style={{
            fontSize: `${layout.metaSize}px`,
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.2,
            marginBottom: '4px',
          }}
        >
          {formatTime(start)}
          {apt.event_type !== 'general' ? ` - ${formatTime(end)}` : ''}
        </p>
        <p
          className="font-semibold"
          style={{
            fontSize: `${layout.titleSize}px`,
            color: 'white',
            lineHeight: 1.25,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {buildAppointmentDisplayTitle(apt)}
        </p>
        <div
          className="flex items-center gap-1.5"
          style={{ marginTop: '6px', minHeight: `${layout.badgeSize}px` }}
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
              className="flex items-start justify-end pr-2"
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
  currentDate,
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
    const ratio = Math.max(0, Math.min((width - 320) / 480, 1))
    const dayGap = Math.round(interpolate(6, 10, ratio))
    const preferredMinDayWidth = Math.round(interpolate(MIN_DAY_WIDTH, 126, ratio))
    const visibleDays = Math.max(
      MIN_VISIBLE_DAYS,
      Math.min(
        MAX_VISIBLE_DAYS,
        Math.floor((width + dayGap) / (preferredMinDayWidth + dayGap))
      )
    )
    const rawDayWidth = (width - dayGap * (visibleDays - 1)) / visibleDays
    const dayColumnWidth = Math.max(
      MIN_DAY_WIDTH,
      Math.min(MAX_DAY_WIDTH, rawDayWidth)
    )
    const slotHeight = Math.round(interpolate(50, 62, ratio))
    const headerHeight = Math.round(interpolate(58, 70, ratio))
    const timeGutterWidth = Math.round(interpolate(40, 52, ratio))
    const metaSize = Math.round(interpolate(10, 11, ratio))
    const titleSize = Math.round(interpolate(12, 13, ratio))
    const iconSize = Math.round(interpolate(10, 12, ratio))
    const cardPaddingX = Math.round(interpolate(8, 11, ratio))
    const cardPaddingY = Math.round(interpolate(7, 10, ratio))
    const badgeSize = Math.round(interpolate(15, 17, ratio))

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
    <div className="glass-cool rounded-[18px] p-2.5">
      <div className="flex items-start gap-2">
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
            className="overflow-x-auto pb-1"
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
                {weekDays.map((day, dayIndex) => {
                  const isToday = moment(day).isSame(moment(today), 'day')
                  const isFestivo = FESTIVOS_CO.has(toDateKey(day))
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  const count = appointmentsByDay[dayIndex]?.length ?? 0

                  return (
                    <button
                      key={`header-${day.toISOString()}`}
                      type="button"
                      onClick={() => onNewSlot(buildSuggestedSlot(day, today))}
                      className="rounded-[14px] text-center"
                      style={{
                        scrollSnapAlign: 'start',
                        height: layout.headerHeight,
                        padding: `${Math.max(layout.cardPaddingY - 1, 6)}px ${Math.max(layout.cardPaddingX - 1, 7)}px`,
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
                          marginBottom: '3px',
                        }}
                      >
                        {moment(day).format('ddd').replace('.', '')}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        <p
                          className="font-semibold"
                          style={{
                            fontSize: `${layout.titleSize + 5}px`,
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
                      {count > 0 && (
                        <p
                          style={{
                            fontSize: `${layout.metaSize}px`,
                            color: 'var(--ink-cool-soft)',
                            marginTop: '3px',
                          }}
                        >
                          {count} cita{count === 1 ? '' : 's'}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>

              <div
                className="mt-2 grid"
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
                    layout.slotHeight
                  )

                  return (
                    <div
                      key={day.toISOString()}
                      className="relative rounded-[14px] overflow-hidden"
                      style={{
                        scrollSnapAlign: 'start',
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
                                  ? '1px solid rgba(185,174,189,0.2)'
                                  : '1px dashed rgba(185,174,189,0.12)',
                              background:
                                index % 2 === 0
                                  ? 'rgba(255,255,255,0.08)'
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
