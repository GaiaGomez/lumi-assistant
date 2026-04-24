'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react'
import { getStroke } from 'perfect-freehand'
import {
  Eraser,
  Highlighter,
  Pen,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react'
import type { ClinicalCanvasPath } from '@/types'

type DrawingTool = 'pen' | 'highlighter' | 'eraser'
type BackgroundStyle = 'plain' | 'dots' | 'lines'

interface DrawingCanvasProps {
  onChange: (snapshot: { dataUrl: string; paths: ClinicalCanvasPath[] }) => void
  initialPaths?: ClinicalCanvasPath[] | null
  backgroundImage?: string | null
  initialHeight?: number
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export interface DrawingCanvasHandle {
  flushPng: () => Promise<void>
}

// Metadata captured at pointer-down — stays stable for the life of one stroke
interface StrokeMeta {
  id: string
  color: string
  width: number
  tool: DrawingTool
  simulatePressure: boolean
}

const COLOR_OPTIONS = [
  { label: 'Negro', value: '#1C1C1E' },
  { label: 'Pizarra', value: '#3B5278' },
  { label: 'Cafe', value: '#3D2E22' },
  { label: 'Taupe', value: '#7B685F' },
  { label: 'Rosado', value: '#B98F95' },
  { label: 'Lavanda', value: '#9081A4' },
]

const STROKE_OPTIONS = [1.5, 2.5, 4, 5.5]
const CANVAS_GROW_STEP = 520
const CANVAS_GROW_OFFSET = 280
const PNG_EXPORT_DEBOUNCE_MS = 500
const PEN_DETECTED_KEY = 'lumi-canvas-pen-mode'
const CANVAS_BG = '#FAF7F4'

interface InternalStroke {
  id: string
  points: Array<[number, number, number]>
  color: string
  width: number
  tool: DrawingTool
  simulatePressure: boolean
}

function readPenDetected(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PEN_DETECTED_KEY) === '1'
}

function isStylusTabletEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(any-pointer: fine)').matches
  )
}

function svgPathFromOutline(points: number[][]): string {
  if (!points.length) return ''
  const d: (string | number)[] = ['M', points[0][0], points[0][1]]
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    d.push('Q', x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  if (points.length > 1) {
    const last = points[points.length - 1]
    d.push('L', last[0], last[1])
  }
  d.push('Z')
  return d.join(' ')
}

// isActive=true → last:false (stroke still growing); isActive=false → last:true (taper applied)
function computeStrokePath(stroke: InternalStroke, isActive = false): string {
  let outline: number[][]

  if (stroke.tool === 'highlighter') {
    outline = getStroke(stroke.points, {
      size: (stroke.width + 3) * 4,
      thinning: 0,
      smoothing: 0.68,
      streamline: 0.50,
      simulatePressure: false,
      last: !isActive,
    })
  } else if (stroke.tool === 'eraser') {
    outline = getStroke(stroke.points, {
      size: stroke.width * 10,
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      last: !isActive,
    })
  } else {
    outline = getStroke(stroke.points, {
      size: stroke.width * 3.8,
      thinning: 0.42,
      smoothing: 0.72,
      streamline: 0.50,
      simulatePressure: stroke.simulatePressure,
      last: !isActive,
      start: { taper: 14, easing: (t: number) => Math.sqrt(t) },
      end: { taper: 10, easing: (t: number) => t * t },
    })
  }

  return svgPathFromOutline(outline)
}

function loadedPathsToStrokes(paths: ClinicalCanvasPath[]): InternalStroke[] {
  return paths.map((p, i) => ({
    id: `loaded-${i}`,
    points: p.paths.map(pt => [pt.x, pt.y, pt.pressure ?? 0.5] as [number, number, number]),
    color: p.drawMode ? p.strokeColor : CANVAS_BG,
    width: p.strokeWidth,
    tool: p.drawMode ? 'pen' : 'eraser',
    simulatePressure: true,
  }))
}

function strokesToClinicalPaths(strokes: InternalStroke[]): ClinicalCanvasPath[] {
  return strokes.map(s => ({
    drawMode: s.tool !== 'eraser',
    strokeColor: s.color,
    strokeWidth: s.width,
    paths: s.points.map(([x, y, pressure]) => ({ x, y, pressure })),
  }))
}

async function exportSvgToPng(
  svgEl: SVGSVGElement,
  width: number,
  height: number,
  backgroundImage: string | null,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, width, height)

  if (backgroundImage) {
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { ctx.drawImage(img, 0, 0, width, height); resolve() }
      img.onerror = () => resolve()
      img.src = backgroundImage
    })
  }

  const svgData = new XMLSerializer().serializeToString(svgEl)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); resolve() }
    img.onerror = () => { URL.revokeObjectURL(url); reject() }
    img.src = url
  })

  return canvas.toDataURL('image/png')
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas({
  onChange,
  initialPaths,
  backgroundImage,
  initialHeight = 640,
  scrollContainerRef,
}, ref) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // ── Toolbar UI state (React renders these) ──────────────────────────────────
  const [tool, setTool] = useState<DrawingTool>('pen')
  const [strokeWidth, setStrokeWidth] = useState(2.5)
  const [strokeColor, setStrokeColor] = useState(COLOR_OPTIONS[0].value)
  const [canvasHeight, setCanvasHeight] = useState(initialHeight)
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('plain')
  const [penMode, setPenMode] = useState<boolean>(false)

  // ── Committed strokes (React renders these, updated only on pointer-up) ─────
  const [completedStrokes, setCompletedStrokes] = useState<InternalStroke[]>(
    () => initialPaths ? loadedPathsToStrokes(initialPaths) : []
  )
  const redoStackRef = useRef<InternalStroke[]>([])
  const completedStrokesRef = useRef<InternalStroke[]>(completedStrokes)
  useEffect(() => { completedStrokesRef.current = completedStrokes }, [completedStrokes])

  // ── Live stroke — fully outside React, zero re-renders during drawing ───────
  // Points accumulate here on every pointer-move; RAF reads and renders them.
  const activePointsRef = useRef<Array<[number, number, number]>>([])
  // Metadata captured once at pointer-down (color, width, tool, etc.)
  const activeMetaRef = useRef<StrokeMeta | null>(null)
  // Direct ref to the persistent SVG <path> element for the live stroke
  const activeSvgPathRef = useRef<SVGPathElement | null>(null)
  // requestAnimationFrame handle — null when no frame is pending
  const rafRef = useRef<number | null>(null)

  const lastDataUrlRef = useRef<string>('')
  const pngDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPenMode(readPenDetected() || isStylusTabletEnvironment())
  }, [])

  useEffect(() => {
    return () => {
      if (pngDebounceRef.current) clearTimeout(pngDebounceRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    async flushPng() {
      if (pngDebounceRef.current) {
        clearTimeout(pngDebounceRef.current)
        pngDebounceRef.current = null
      }
      const strokes = completedStrokesRef.current
      if (!strokes.length) return
      const svg = svgRef.current
      const container = containerRef.current
      if (!svg || !container) return
      const dataUrl = await exportSvgToPng(svg, container.clientWidth, canvasHeight, backgroundImage ?? null)
      if (dataUrl) {
        lastDataUrlRef.current = dataUrl
        onChangeRef.current({ dataUrl, paths: strokesToClinicalPaths(strokes) })
      }
    },
  }))

  useEffect(() => {
    function maybeGrowCanvas() {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const scrollContainer = scrollContainerRef?.current
      const viewportBottom = scrollContainer
        ? scrollContainer.getBoundingClientRect().bottom
        : window.innerHeight
      if (rect.bottom - viewportBottom <= CANVAS_GROW_OFFSET) {
        setCanvasHeight((h) => h + CANVAS_GROW_STEP)
      }
    }
    maybeGrowCanvas()
    const scrollTarget: Window | HTMLElement = scrollContainerRef?.current ?? window
    scrollTarget.addEventListener('scroll', maybeGrowCanvas, { passive: true })
    window.addEventListener('resize', maybeGrowCanvas)
    return () => {
      scrollTarget.removeEventListener('scroll', maybeGrowCanvas)
      window.removeEventListener('resize', maybeGrowCanvas)
    }
  }, [scrollContainerRef])

  function scheduleOrEmitPng(strokes: InternalStroke[]) {
    const paths = strokesToClinicalPaths(strokes)
    if (strokes.length === 0) {
      lastDataUrlRef.current = ''
      onChange({ dataUrl: '', paths })
      return
    }
    onChange({ dataUrl: lastDataUrlRef.current, paths })
    if (pngDebounceRef.current) clearTimeout(pngDebounceRef.current)
    pngDebounceRef.current = setTimeout(async () => {
      const svg = svgRef.current
      const container = containerRef.current
      if (!svg || !container) return
      const currentStrokes = completedStrokesRef.current
      if (!currentStrokes.length) return
      try {
        const dataUrl = await exportSvgToPng(svg, container.clientWidth, canvasHeight, backgroundImage ?? null)
        lastDataUrlRef.current = dataUrl
        onChangeRef.current({ dataUrl, paths: strokesToClinicalPaths(currentStrokes) })
      } catch {
        // export failed — paths are still saved
      }
    }, PNG_EXPORT_DEBOUNCE_MS)
  }

  // ── RAF render loop for the live stroke ─────────────────────────────────────
  // Called at most once per display frame. Reads from refs, writes to DOM directly.
  function renderActiveStroke() {
    rafRef.current = null
    const meta = activeMetaRef.current
    const points = activePointsRef.current
    const pathEl = activeSvgPathRef.current
    if (!meta || !pathEl || points.length < 2) return

    const tempStroke: InternalStroke = {
      id: meta.id,
      points,
      color: meta.color,
      width: meta.width,
      tool: meta.tool,
      simulatePressure: meta.simulatePressure,
    }
    pathEl.setAttribute('d', computeStrokePath(tempStroke, true))
    pathEl.setAttribute('fill', meta.color)
  }

  function scheduleRaf() {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(renderActiveStroke)
    }
  }

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (penMode && e.pointerType !== 'pen') return

    if (e.pointerType === 'pen' && !penMode) {
      setPenMode(true)
      localStorage.setItem(PEN_DETECTED_KEY, '1')
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    redoStackRef.current = []

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = e.pressure > 0 ? e.pressure : 0.5

    const color =
      tool === 'eraser'
        ? CANVAS_BG
        : tool === 'highlighter'
          ? `${strokeColor}66`
          : strokeColor

    // Populate refs — no setState, no re-render
    activePointsRef.current = [[x, y, pressure]]
    activeMetaRef.current = {
      id: `stroke-${Date.now()}`,
      color,
      width: strokeWidth,
      tool,
      simulatePressure: e.pointerType !== 'pen',
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!activeMetaRef.current) return

    const rect = e.currentTarget.getBoundingClientRect()
    // Coalesced events recover all intermediate positions between frames
    // (critical for Apple Pencil at 240Hz)
    const events = (
      (e.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] })
        .getCoalescedEvents?.() ?? [e.nativeEvent as PointerEvent]
    )

    for (const evt of events) {
      activePointsRef.current.push([
        evt.clientX - rect.left,
        evt.clientY - rect.top,
        evt.pressure > 0 ? evt.pressure : 0.5,
      ])
    }

    // Schedule one RAF per frame — batches all points accumulated since last frame
    scheduleRaf()
  }

  function finalizeStroke() {
    const meta = activeMetaRef.current
    if (!meta) return

    // Cancel any pending RAF for this stroke
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const points = [...activePointsRef.current]

    // Reset the live path element immediately
    const pathEl = activeSvgPathRef.current
    if (pathEl) {
      pathEl.setAttribute('d', '')
      pathEl.setAttribute('fill', 'none')
    }

    // Clear active refs
    activePointsRef.current = []
    activeMetaRef.current = null

    if (!points.length) return

    const stroke: InternalStroke = {
      id: meta.id,
      points,
      color: meta.color,
      width: meta.width,
      tool: meta.tool,
      simulatePressure: meta.simulatePressure,
    }

    // React state update happens once, after the stroke is complete
    setCompletedStrokes((prev) => {
      const next = [...prev, stroke]
      scheduleOrEmitPng(next)
      return next
    })
  }

  function handleUndo() {
    setCompletedStrokes((prev) => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      redoStackRef.current = [last, ...redoStackRef.current]
      const next = prev.slice(0, -1)
      scheduleOrEmitPng(next)
      return next
    })
  }

  function handleRedo() {
    const [first, ...rest] = redoStackRef.current
    if (!first) return
    redoStackRef.current = rest
    setCompletedStrokes((prev) => {
      const next = [...prev, first]
      scheduleOrEmitPng(next)
      return next
    })
  }

  function handleClear() {
    redoStackRef.current = []
    lastDataUrlRef.current = ''
    setCompletedStrokes([])
    onChange({ dataUrl: '', paths: [] })
  }

  function cycleBackground() {
    setBackgroundStyle(s => s === 'plain' ? 'dots' : s === 'dots' ? 'lines' : 'plain')
  }

  const totalStrokes = completedStrokes.length

  return (
    <div className="space-y-3.5">
      {/* ── Toolbar ── */}
      <div
        className="rounded-[22px] p-2.5"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.34) 100%)',
          border: '1px solid rgba(255,255,255,0.42)',
          boxShadow: '0 14px 36px rgba(124, 108, 128, 0.08)',
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap">
          {[
            { id: 'pen', label: 'Lapiz', icon: Pen },
            { id: 'highlighter', label: 'Marcador', icon: Highlighter },
            { id: 'eraser', label: 'Borrador', icon: Eraser },
          ].map((item) => {
            const Icon = item.icon
            const active = tool === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTool(item.id as DrawingTool)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] whitespace-nowrap shrink-0"
                style={active ? {
                  background: 'rgba(255,255,255,0.88)',
                  color: 'var(--ink-cool-strong)',
                  border: '1px solid rgba(255,255,255,0.62)',
                  boxShadow: '0 10px 22px rgba(124, 108, 128, 0.10)',
                } : {
                  background: 'rgba(255,255,255,0.22)',
                  color: 'var(--ink-cool-soft)',
                  border: '1px solid rgba(255,255,255,0.24)',
                }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}

          <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_OPTIONS.map((option) => {
              const active = strokeColor === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStrokeColor(option.value)}
                  className="h-7 w-7 rounded-full shrink-0"
                  style={{
                    background: option.value,
                    border: active ? '2px solid rgba(255,255,255,0.92)' : '1px solid rgba(255,255,255,0.42)',
                    boxShadow: active ? '0 0 0 2.5px rgba(120, 106, 130, 0.30)' : 'none',
                    transform: active ? 'scale(1.14)' : 'scale(1)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  aria-label={`Usar ${option.label}`}
                />
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STROKE_OPTIONS.map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => setStrokeWidth(width)}
                className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 shrink-0"
                style={strokeWidth === width ? {
                  background: 'rgba(255,255,255,0.88)',
                  border: '1px solid rgba(255,255,255,0.64)',
                  color: 'var(--ink-cool-strong)',
                } : {
                  background: 'rgba(255,255,255,0.24)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  color: 'var(--ink-cool-soft)',
                }}
                aria-label={`Grosor ${width}`}
              >
                <span
                  className="rounded-full"
                  style={{ width: width * 2 + 1, height: width * 2 + 1, background: 'currentColor' }}
                />
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={cycleBackground}
              className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
              title={backgroundStyle === 'plain' ? 'Ver con puntos' : backgroundStyle === 'dots' ? 'Ver con líneas' : 'Sin fondo'}
              style={{
                background: backgroundStyle !== 'plain' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.32)',
                color: backgroundStyle !== 'plain' ? 'var(--ink-cool-strong)' : 'var(--ink-cool-soft)',
              }}
              aria-label="Cambiar fondo del canvas"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                {backgroundStyle === 'dots' ? (
                  <>
                    <circle cx="3.5" cy="3.5" r="1.1" fill="currentColor" />
                    <circle cx="7.5" cy="3.5" r="1.1" fill="currentColor" />
                    <circle cx="11.5" cy="3.5" r="1.1" fill="currentColor" />
                    <circle cx="3.5" cy="7.5" r="1.1" fill="currentColor" />
                    <circle cx="7.5" cy="7.5" r="1.1" fill="currentColor" />
                    <circle cx="11.5" cy="7.5" r="1.1" fill="currentColor" />
                    <circle cx="3.5" cy="11.5" r="1.1" fill="currentColor" />
                    <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" />
                    <circle cx="11.5" cy="11.5" r="1.1" fill="currentColor" />
                  </>
                ) : backgroundStyle === 'lines' ? (
                  <>
                    <line x1="2" y1="4.5" x2="13" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                ) : (
                  <rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                )}
              </svg>
            </button>

            <button
              type="button"
              onClick={handleUndo}
              className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
              style={{ background: 'rgba(255,255,255,0.32)', color: 'var(--ink-cool-soft)' }}
              aria-label="Deshacer"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
              style={{ background: 'rgba(255,255,255,0.32)', color: 'var(--ink-cool-soft)' }}
              aria-label="Rehacer"
            >
              <Redo2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
              style={{ background: 'rgba(255,255,255,0.32)', color: 'var(--state-cancel-text)' }}
              aria-label="Eliminar dibujo"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[24px]"
        style={{
          minHeight: canvasHeight,
          background: CANVAS_BG,
          border: '1px solid rgba(255,255,255,0.42)',
          boxShadow: '0 18px 42px rgba(120,110,130,0.10)',
        }}
      >
        {backgroundImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImage}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}
        <svg
          ref={svgRef}
          width="100%"
          height={canvasHeight}
          style={{
            display: 'block',
            touchAction: 'none',
            cursor: tool === 'eraser' ? 'cell' : 'crosshair',
            position: 'relative',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finalizeStroke}
          onPointerCancel={finalizeStroke}
        >
          <defs>
            <pattern id="canvas-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1" fill="rgba(55,45,65,0.14)" />
            </pattern>
            <pattern id="canvas-lines" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <line x1="0" y1="28" x2="28" y2="28" stroke="rgba(55,45,65,0.11)" strokeWidth="1" />
            </pattern>
          </defs>

          {backgroundStyle !== 'plain' && (
            <rect width="100%" height={canvasHeight} fill={`url(#canvas-${backgroundStyle})`} />
          )}

          {/* Committed strokes — rendered by React, updated only on pointer-up */}
          {completedStrokes.map((stroke) => (
            <path
              key={stroke.id}
              d={computeStrokePath(stroke)}
              fill={stroke.color}
              stroke="none"
              shapeRendering="geometricPrecision"
            />
          ))}

          {/* Live stroke — always in the DOM, updated directly via setAttribute in RAF */}
          <path
            ref={activeSvgPathRef}
            d=""
            fill="none"
            stroke="none"
            shapeRendering="geometricPrecision"
          />
        </svg>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px]" style={{ color: 'var(--ink-cool-faint)' }}>
          {totalStrokes === 0
            ? penMode
              ? 'Listo para escribir con Apple Pencil.'
              : 'Listo para escribir con Apple Pencil o mouse.'
            : `${totalStrokes} trazos guardados en esta nota.`}
        </p>
        {penMode && (
          <p className="text-[11px]" style={{ color: 'var(--ink-cool-faint)' }}>
            Modo lápiz activo — los toques con palma no dibujan.
          </p>
        )}
      </div>
    </div>
  )
})

export default DrawingCanvas
