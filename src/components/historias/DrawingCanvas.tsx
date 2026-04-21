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

const COLOR_OPTIONS = [
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

// Internal stroke representation — richer than ClinicalCanvasPath for rendering
interface InternalStroke {
  id: string
  points: Array<[number, number, number]>   // [x, y, pressure]
  color: string
  width: number
  tool: DrawingTool
}

function readPenDetected(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PEN_DETECTED_KEY) === '1'
}

// Returns true on stylus-capable tablets (iPad + Apple Pencil) so we start in
// pen-only mode before any stylus event has been observed.
function isStylusTabletEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(any-pointer: fine)').matches
  )
}

// Convert the outline polygon from perfect-freehand to an SVG path string.
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

function computeStrokePath(stroke: InternalStroke, isActive = false): string {
  // perfect-freehand size is the maximum stroke diameter in px.
  // We scale up from the UI width values (which were SVG stroke-width values)
  // to get visually equivalent results.
  const baseSize =
    stroke.tool === 'highlighter'
      ? (stroke.width + 2.5) * 3.5
      : stroke.tool === 'eraser'
        ? stroke.width * 9
        : stroke.width * 3.5

  const outline = getStroke(stroke.points, {
    size: baseSize,
    thinning: stroke.tool === 'highlighter' ? 0 : 0.55,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: false,
    last: !isActive,
  })

  return svgPathFromOutline(outline)
}

function loadedPathsToStrokes(paths: ClinicalCanvasPath[]): InternalStroke[] {
  return paths.map((p, i) => ({
    id: `loaded-${i}`,
    // Legacy paths have no pressure — use 0.5 (neutral) for uniform appearance
    points: p.paths.map(pt => [pt.x, pt.y, pt.pressure ?? 0.5] as [number, number, number]),
    // Eraser strokes were stored with drawMode=false
    color: p.drawMode ? p.strokeColor : CANVAS_BG,
    width: p.strokeWidth,
    tool: p.drawMode ? 'pen' : 'eraser',
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
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = backgroundImage
    })
  }

  const svgData = new XMLSerializer().serializeToString(svgEl)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve()
    }
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

  const [tool, setTool] = useState<DrawingTool>('pen')
  const [strokeWidth, setStrokeWidth] = useState(2.5)
  const [strokeColor, setStrokeColor] = useState(COLOR_OPTIONS[0].value)
  const [canvasHeight, setCanvasHeight] = useState(initialHeight)

  const [completedStrokes, setCompletedStrokes] = useState<InternalStroke[]>(
    () => initialPaths ? loadedPathsToStrokes(initialPaths) : []
  )
  const [activeStroke, setActiveStroke] = useState<InternalStroke | null>(null)
  const redoStackRef = useRef<InternalStroke[]>([])
  // Keep a stable ref for use inside event handlers
  const completedStrokesRef = useRef<InternalStroke[]>(completedStrokes)
  useEffect(() => { completedStrokesRef.current = completedStrokes }, [completedStrokes])

  const [penMode, setPenMode] = useState<boolean>(false)
  useEffect(() => {
    setPenMode(readPenDetected() || isStylusTabletEnvironment())
  }, [])

  const lastDataUrlRef = useRef<string>('')
  const pngDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pngDebounceRef.current) clearTimeout(pngDebounceRef.current)
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

  // Auto-grow canvas as user scrolls near the bottom
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
    // Emit immediately with cached dataUrl for responsiveness
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
        // SVG export failed — skip silently; paths are still saved
      }
    }, PNG_EXPORT_DEBOUNCE_MS)
  }

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

    setActiveStroke({
      id: `stroke-${Date.now()}`,
      points: [[x, y, pressure]],
      color,
      width: strokeWidth,
      tool,
    })
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!activeStroke) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = e.pressure > 0 ? e.pressure : 0.5

    setActiveStroke((prev) => {
      if (!prev) return null
      return { ...prev, points: [...prev.points, [x, y, pressure]] }
    })
  }

  function handlePointerUp() {
    const stroke = activeStroke
    if (!stroke) return
    setActiveStroke(null)
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
                  className="h-8 w-8 rounded-full shrink-0"
                  style={{
                    background: option.value,
                    border: active ? '2px solid rgba(255,255,255,0.92)' : '1px solid rgba(255,255,255,0.42)',
                    boxShadow: active ? '0 0 0 2px rgba(120, 106, 130, 0.24)' : 'none',
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
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {completedStrokes.map((stroke) => (
            <path
              key={stroke.id}
              d={computeStrokePath(stroke)}
              fill={stroke.color}
              stroke="none"
            />
          ))}
          {activeStroke && activeStroke.points.length > 1 && (
            <path
              d={computeStrokePath(activeStroke, true)}
              fill={activeStroke.color}
              stroke="none"
            />
          )}
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
