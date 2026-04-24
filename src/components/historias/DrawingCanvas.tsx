'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react'
import { getStroke } from 'perfect-freehand'
import { Eraser, Redo2, Trash2, Undo2 } from 'lucide-react'
import type { ClinicalCanvasPath } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawingTool = 'pluma-fina' | 'pluma-gel' | 'lapiz-suave' | 'marcador' | 'resaltador' | 'borrador'
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

interface InternalStroke {
  id: string
  points: Array<[number, number, number]>
  color: string
  width: number
  tool: DrawingTool
  simulatePressure: boolean
}

// ─── Pen presets ──────────────────────────────────────────────────────────────
// Each preset defines its visual character independently of stroke width.
// The toolbar shows a live stroke preview bar colored with the current ink color.

interface PenPreset {
  id: DrawingTool
  label: string
  defaultWidth: number  // auto-applied when preset is selected
  // Stroke preview bar (toolbar visual)
  previewH: number      // bar height in px
  previewRadius: number // border-radius
  previewOpacity: number
  previewSquare?: boolean  // flat ends for marcador
}

const PEN_PRESETS: PenPreset[] = [
  {
    id: 'pluma-fina',
    label: 'Fina',
    defaultWidth: 1.5,
    previewH: 1.5,
    previewRadius: 999,
    previewOpacity: 1,
  },
  {
    id: 'pluma-gel',
    label: 'Gel',
    defaultWidth: 2.5,
    previewH: 2.5,
    previewRadius: 999,
    previewOpacity: 1,
  },
  {
    id: 'lapiz-suave',
    label: 'Lápiz',
    defaultWidth: 2.5,
    previewH: 3,
    previewRadius: 999,
    previewOpacity: 0.72,
  },
  {
    id: 'marcador',
    label: 'Marcador',
    defaultWidth: 4,
    previewH: 6,
    previewRadius: 2,
    previewOpacity: 1,
    previewSquare: true,
  },
  {
    id: 'resaltador',
    label: 'Resaltador',
    defaultWidth: 5.5,
    previewH: 10,
    previewRadius: 3,
    previewOpacity: 0.42,
  },
  {
    id: 'borrador',
    label: 'Borrador',
    defaultWidth: 4,
    previewH: 0,
    previewRadius: 0,
    previewOpacity: 0,
  },
]

// perfect-freehand parameters per pen type
interface PenParams {
  sizeScale: number
  thinning: number
  smoothing: number
  streamline: number
  startTaper: number
  endTaper: number
  startEasing: (t: number) => number
  endEasing: (t: number) => number
}

const PRESET_PARAMS: Record<'pluma-fina' | 'pluma-gel' | 'lapiz-suave' | 'marcador', PenParams> = {
  // Very fine, high-pressure sensitivity, long elegant taper — like a 0.3mm liner
  'pluma-fina': {
    sizeScale: 3.0,
    thinning: 0.62,
    smoothing: 0.80,
    streamline: 0.55,
    startTaper: 22,
    endTaper: 18,
    startEasing: (t) => Math.sqrt(t),
    endEasing: (t) => t * t,
  },
  // Versatile gel pen — balanced pressure response, clean taper
  'pluma-gel': {
    sizeScale: 3.8,
    thinning: 0.42,
    smoothing: 0.72,
    streamline: 0.50,
    startTaper: 12,
    endTaper: 9,
    startEasing: (t) => Math.sqrt(t),
    endEasing: (t) => t * t,
  },
  // Soft pencil — wider range of pressure variation, longer fades, slightly less smooth
  'lapiz-suave': {
    sizeScale: 4.5,
    thinning: 0.68,
    smoothing: 0.60,
    streamline: 0.45,
    startTaper: 28,
    endTaper: 22,
    startEasing: (t) => t,       // linear start = pencil enters full width
    endEasing: (t) => t * t,
  },
  // Felt marker — thick, nearly uniform, minimal taper for blunt ends
  'marcador': {
    sizeScale: 5.5,
    thinning: 0.08,
    smoothing: 0.68,
    streamline: 0.50,
    startTaper: 2,
    endTaper: 2,
    startEasing: (t) => t,
    endEasing: (t) => t,
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Pure functions ───────────────────────────────────────────────────────────

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

// isActive=true → last:false (stroke growing); isActive=false → last:true (taper finalized)
function computeStrokePath(stroke: InternalStroke, isActive = false): string {
  let outline: number[][]

  if (stroke.tool === 'borrador') {
    outline = getStroke(stroke.points, {
      size: stroke.width * 10,
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
      last: !isActive,
    })
  } else if (stroke.tool === 'resaltador') {
    outline = getStroke(stroke.points, {
      size: (stroke.width + 4) * 6,
      thinning: 0,
      smoothing: 0.65,
      streamline: 0.48,
      simulatePressure: false,
      last: !isActive,
    })
  } else {
    const p = PRESET_PARAMS[stroke.tool]
    outline = getStroke(stroke.points, {
      size: stroke.width * p.sizeScale,
      thinning: p.thinning,
      smoothing: p.smoothing,
      streamline: p.streamline,
      simulatePressure: stroke.simulatePressure,
      last: !isActive,
      start: { taper: p.startTaper, easing: p.startEasing },
      end: { taper: p.endTaper, easing: p.endEasing },
    })
  }

  return svgPathFromOutline(outline)
}

function detectLegacyTool(p: ClinicalCanvasPath): DrawingTool {
  if (!p.drawMode) return 'borrador'
  // Highlighter colors were stored as #xxxxxx66 (9-char hex with opacity suffix)
  if (p.strokeColor.length === 9) return 'resaltador'
  return 'pluma-gel'
}

function loadedPathsToStrokes(paths: ClinicalCanvasPath[]): InternalStroke[] {
  return paths.map((p, i) => ({
    id: `loaded-${i}`,
    points: p.paths.map(pt => [pt.x, pt.y, pt.pressure ?? 0.5] as [number, number, number]),
    color: p.drawMode ? p.strokeColor : CANVAS_BG,
    width: p.strokeWidth,
    tool: detectLegacyTool(p),
    simulatePressure: true,
  }))
}

function strokesToClinicalPaths(strokes: InternalStroke[]): ClinicalCanvasPath[] {
  return strokes.map(s => ({
    drawMode: s.tool !== 'borrador',
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

// ─── Component ────────────────────────────────────────────────────────────────

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

  // ── Toolbar UI state ────────────────────────────────────────────────────────
  const [tool, setTool] = useState<DrawingTool>('pluma-gel')
  const [strokeWidth, setStrokeWidth] = useState(2.5)
  const [strokeColor, setStrokeColor] = useState(COLOR_OPTIONS[0].value)
  const [canvasHeight, setCanvasHeight] = useState(initialHeight)
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('plain')
  const [penMode, setPenMode] = useState<boolean>(false)

  // ── Committed strokes (React renders, updated only on pointer-up) ───────────
  const [completedStrokes, setCompletedStrokes] = useState<InternalStroke[]>(
    () => initialPaths ? loadedPathsToStrokes(initialPaths) : []
  )
  const redoStackRef = useRef<InternalStroke[]>([])
  const completedStrokesRef = useRef<InternalStroke[]>(completedStrokes)
  useEffect(() => { completedStrokesRef.current = completedStrokes }, [completedStrokes])

  // ── Live stroke — fully outside React, zero re-renders during drawing ───────
  const activePointsRef = useRef<Array<[number, number, number]>>([])
  const activeMetaRef = useRef<StrokeMeta | null>(null)
  const activeSvgPathRef = useRef<SVGPathElement | null>(null)
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
      const current = completedStrokesRef.current
      if (!current.length) return
      try {
        const dataUrl = await exportSvgToPng(svg, container.clientWidth, canvasHeight, backgroundImage ?? null)
        lastDataUrlRef.current = dataUrl
        onChangeRef.current({ dataUrl, paths: strokesToClinicalPaths(current) })
      } catch { /* export failed — paths still saved */ }
    }, PNG_EXPORT_DEBOUNCE_MS)
  }

  // ── RAF render loop — reads refs, writes to DOM, zero React overhead ────────
  function renderActiveStroke() {
    rafRef.current = null
    const meta = activeMetaRef.current
    const points = activePointsRef.current
    const pathEl = activeSvgPathRef.current
    if (!meta || !pathEl || points.length < 2) return
    const tempStroke: InternalStroke = {
      id: meta.id, points, color: meta.color, width: meta.width,
      tool: meta.tool, simulatePressure: meta.simulatePressure,
    }
    pathEl.setAttribute('d', computeStrokePath(tempStroke, true))
    pathEl.setAttribute('fill', meta.color)
  }

  function scheduleRaf() {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(renderActiveStroke)
    }
  }

  // ── Pointer handlers ────────────────────────────────────────────────────────

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
      tool === 'borrador'
        ? CANVAS_BG
        : tool === 'resaltador'
          ? `${strokeColor}66`
          : strokeColor

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
    // — on Apple Pencil at 240Hz this recovers 2-4x more points per frame
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
    scheduleRaf()
  }

  function finalizeStroke() {
    const meta = activeMetaRef.current
    if (!meta) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const points = [...activePointsRef.current]
    const pathEl = activeSvgPathRef.current
    if (pathEl) { pathEl.setAttribute('d', ''); pathEl.setAttribute('fill', 'none') }
    activePointsRef.current = []
    activeMetaRef.current = null
    if (!points.length) return

    const stroke: InternalStroke = {
      id: meta.id, points, color: meta.color, width: meta.width,
      tool: meta.tool, simulatePressure: meta.simulatePressure,
    }
    setCompletedStrokes((prev) => {
      const next = [...prev, stroke]
      scheduleOrEmitPng(next)
      return next
    })
  }

  function handleUndo() {
    setCompletedStrokes((prev) => {
      if (!prev.length) return prev
      redoStackRef.current = [prev[prev.length - 1], ...redoStackRef.current]
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

  function selectTool(id: DrawingTool) {
    setTool(id)
    const preset = PEN_PRESETS.find(p => p.id === id)
    if (preset) setStrokeWidth(preset.defaultWidth)
  }

  function cycleBackground() {
    setBackgroundStyle(s => s === 'plain' ? 'dots' : s === 'dots' ? 'lines' : 'plain')
  }

  const totalStrokes = completedStrokes.length

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">

      {/* ── Sticky toolbar ── */}
      <div
        className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
        style={{
          background: 'rgba(250,247,244,0.97)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderBottom: '1px solid rgba(170,160,185,0.16)',
        }}
      >

        {/* Preset selector */}
        <div className="flex items-center gap-0.5">
          {PEN_PRESETS.map((preset) => {
            const active = tool === preset.id
            const isEraser = preset.id === 'borrador'
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectTool(preset.id)}
                className="flex flex-col items-center justify-center rounded-[12px] px-2.5 py-1.5 gap-1 shrink-0 transition-all"
                style={active ? {
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: '0 2px 10px rgba(110,100,130,0.13), 0 0 0 1px rgba(255,255,255,0.7)',
                } : {
                  background: 'transparent',
                }}
              >
                {/* Stroke character preview */}
                <div className="flex h-[14px] items-center justify-center w-7">
                  {isEraser ? (
                    <Eraser
                      size={13}
                      style={{ color: active ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: preset.previewH,
                        borderRadius: preset.previewRadius,
                        background: strokeColor,
                        opacity: preset.previewOpacity,
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-[10px] leading-none whitespace-nowrap"
                  style={{ color: active ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)' }}
                >
                  {preset.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Separator */}
        <div className="h-6 w-px shrink-0" style={{ background: 'rgba(150,140,165,0.18)' }} />

        {/* Color palette */}
        <div className="flex items-center gap-1.5">
          {COLOR_OPTIONS.map((option) => {
            const active = strokeColor === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStrokeColor(option.value)}
                className="h-6 w-6 rounded-full shrink-0 transition-all"
                style={{
                  background: option.value,
                  border: active ? '2px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.5)',
                  boxShadow: active ? `0 0 0 2px ${option.value}55` : 'none',
                  transform: active ? 'scale(1.18)' : 'scale(1)',
                }}
                aria-label={`Usar ${option.label}`}
              />
            )
          })}
        </div>

        {/* Separator */}
        <div className="h-6 w-px shrink-0" style={{ background: 'rgba(150,140,165,0.18)' }} />

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          {STROKE_OPTIONS.map((width) => {
            const active = strokeWidth === width
            return (
              <button
                key={width}
                type="button"
                onClick={() => setStrokeWidth(width)}
                className="flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 shrink-0 transition-all"
                style={active ? {
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: '0 2px 8px rgba(110,100,130,0.12)',
                } : {
                  background: 'transparent',
                }}
                aria-label={`Grosor ${width}`}
              >
                <span
                  className="rounded-full block"
                  style={{
                    width: Math.round(width * 2) + 1,
                    height: Math.round(width * 2) + 1,
                    background: active ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)',
                  }}
                />
              </button>
            )
          })}
        </div>

        {/* Separator */}
        <div className="h-6 w-px shrink-0" style={{ background: 'rgba(150,140,165,0.18)' }} />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Background grid */}
          <button
            type="button"
            onClick={cycleBackground}
            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-all"
            title={backgroundStyle === 'plain' ? 'Ver con puntos' : backgroundStyle === 'dots' ? 'Ver con líneas' : 'Sin fondo'}
            style={{
              background: backgroundStyle !== 'plain' ? 'rgba(255,255,255,0.96)' : 'transparent',
              color: backgroundStyle !== 'plain' ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)',
            }}
            aria-label="Cambiar fondo"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              {backgroundStyle === 'dots' ? (
                <>
                  <circle cx="3" cy="3" r="1.1" fill="currentColor" />
                  <circle cx="7" cy="3" r="1.1" fill="currentColor" />
                  <circle cx="11" cy="3" r="1.1" fill="currentColor" />
                  <circle cx="3" cy="7" r="1.1" fill="currentColor" />
                  <circle cx="7" cy="7" r="1.1" fill="currentColor" />
                  <circle cx="11" cy="7" r="1.1" fill="currentColor" />
                  <circle cx="3" cy="11" r="1.1" fill="currentColor" />
                  <circle cx="7" cy="11" r="1.1" fill="currentColor" />
                  <circle cx="11" cy="11" r="1.1" fill="currentColor" />
                </>
              ) : backgroundStyle === 'lines' ? (
                <>
                  <line x1="1.5" y1="4" x2="12.5" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="1.5" y1="7" x2="12.5" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="1.5" y1="10" x2="12.5" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </>
              ) : (
                <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
              )}
            </svg>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
            style={{ color: 'var(--ink-cool-muted)' }}
            aria-label="Deshacer"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
            style={{ color: 'var(--ink-cool-muted)' }}
            aria-label="Rehacer"
          >
            <Redo2 size={14} />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
            style={{ color: 'var(--state-cancel-text)' }}
            aria-label="Eliminar dibujo"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Pen mode indicator */}
        {penMode && (
          <span
            className="ml-auto text-[10px] shrink-0"
            style={{ color: 'var(--ink-cool-faint)' }}
          >
            Modo lápiz
          </span>
        )}
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative"
        style={{
          minHeight: canvasHeight,
          background: CANVAS_BG,
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
            cursor: tool === 'borrador' ? 'cell' : 'crosshair',
            position: 'relative',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finalizeStroke}
          onPointerCancel={finalizeStroke}
        >
          <defs>
            {/* Subtle dot grid — 26px spacing, warm-toned */}
            <pattern id="canvas-dots" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="13" cy="13" r="0.9" fill="rgba(80,65,100,0.13)" />
            </pattern>
            {/* Ruled lines — 30px spacing, light and elegant */}
            <pattern id="canvas-lines" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <line x1="0" y1="30" x2="30" y2="30" stroke="rgba(80,65,100,0.10)" strokeWidth="1" />
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

          {/* Live stroke — DOM-managed directly via setAttribute in RAF */}
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
      {totalStrokes > 0 && (
        <div className="px-4 py-2">
          <p className="text-[11px]" style={{ color: 'var(--ink-cool-faint)' }}>
            {totalStrokes} {totalStrokes === 1 ? 'trazo' : 'trazos'}
          </p>
        </div>
      )}
    </div>
  )
})

export default DrawingCanvas
