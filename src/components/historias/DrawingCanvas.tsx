'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react'
import type { CanvasPath } from 'react-sketch-canvas'
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas'
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

function castPaths(paths: CanvasPath[]): ClinicalCanvasPath[] {
  return paths as ClinicalCanvasPath[]
}

function readPenDetected(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PEN_DETECTED_KEY) === '1'
}

// Returns true when the primary device is touch-based (tablet/phone) AND a fine pointer
// (stylus) is also available — i.e., iPad with Apple Pencil capability. In that case we
// start in pen-only mode from the very first stroke, preventing palm smudges before any
// stylus event has been observed.
function isStylusTabletEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(any-pointer: fine)').matches
  )
}

export interface DrawingCanvasHandle {
  /** Forces the pending PNG export to fire immediately. Call before unmounting the canvas
   *  to ensure canvasDataUrl is up-to-date in the parent (e.g., when closing the modal). */
  flushPng: () => Promise<void>
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas({
  onChange,
  initialPaths,
  backgroundImage,
  initialHeight = 640,
  scrollContainerRef,
}, ref) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initialPathsRef = useRef(initialPaths)
  // Keep a stable ref to onChange so imperative handle and cleanup can call the latest version
  // without re-running effects.
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const [tool, setTool] = useState<DrawingTool>('pen')
  const [strokeWidth, setStrokeWidth] = useState(2.5)
  const [strokeColor, setStrokeColor] = useState(COLOR_OPTIONS[0].value)
  const [canvasHeight, setCanvasHeight] = useState(initialHeight)
  const [strokeCount, setStrokeCount] = useState<number | null>(null)

  // Palm rejection — start in pen-only mode when:
  // (a) user has previously drawn with a stylus on this device (localStorage), OR
  // (b) environment looks like a stylus-capable tablet (pointer:coarse + any-pointer:fine)
  // In both cases mouse users on desktop are unaffected (pointer:fine → isStylusTabletEnvironment=false).
  const [penMode, setPenMode] = useState<boolean>(false)
  useEffect(() => {
    setPenMode(readPenDetected() || isStylusTabletEnvironment())
  }, [])

  // defer PNG export to avoid blocking stroke rendering
  const lastDataUrlRef = useRef<string>('')
  const pngDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expose flushPng so the parent can force an immediate PNG export before unmounting
  // (e.g., when the modal closes within 500ms of the last stroke).
  useImperativeHandle(ref, () => ({
    async flushPng() {
      if (pngDebounceRef.current) {
        clearTimeout(pngDebounceRef.current)
        pngDebounceRef.current = null
      }
      const canvas = canvasRef.current
      if (!canvas) return
      const paths = castPaths(await canvas.exportPaths())
      if (paths.length === 0) return
      const dataUrl = await canvas.exportImage('png')
      if (dataUrl) {
        lastDataUrlRef.current = dataUrl
        onChangeRef.current({ dataUrl, paths })
      }
    },
  }))

  // Cancel pending PNG debounce on unmount to prevent setState after unmount.
  useEffect(() => {
    return () => {
      if (pngDebounceRef.current) clearTimeout(pngDebounceRef.current)
    }
  }, [])

  useEffect(() => {
    canvasRef.current?.eraseMode(tool === 'eraser')
  }, [tool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.resetCanvas()
    if (initialPathsRef.current && initialPathsRef.current.length > 0) {
      canvas.loadPaths(initialPathsRef.current as CanvasPath[])
    }
  }, [])

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
        setCanvasHeight((currentHeight) => currentHeight + CANVAS_GROW_STEP)
      }
    }

    maybeGrowCanvas()
    const scrollContainer = scrollContainerRef?.current
    const scrollTarget: Window | HTMLElement = scrollContainer ?? window

    scrollTarget.addEventListener('scroll', maybeGrowCanvas, { passive: true })
    window.addEventListener('resize', maybeGrowCanvas)

    return () => {
      scrollTarget.removeEventListener('scroll', maybeGrowCanvas)
      window.removeEventListener('resize', maybeGrowCanvas)
    }
  }, [scrollContainerRef])

  // Emit paths immediately on stroke; defer expensive PNG export.
  // This keeps the drawing responsive — the preview updates shortly after the pen lifts.
  async function emitPathsThenSchedulePng() {
    const canvas = canvasRef.current
    if (!canvas) return

    const paths = castPaths(await canvas.exportPaths())
    setStrokeCount(paths.length)

    if (paths.length === 0) {
      lastDataUrlRef.current = ''
      onChange({ dataUrl: '', paths })
      return
    }

    onChange({ dataUrl: lastDataUrlRef.current, paths })

    if (pngDebounceRef.current) clearTimeout(pngDebounceRef.current)
    pngDebounceRef.current = setTimeout(async () => {
      const freshCanvas = canvasRef.current
      if (!freshCanvas) return
      const freshPaths = castPaths(await freshCanvas.exportPaths())
      if (freshPaths.length === 0) return
      const dataUrl = await freshCanvas.exportImage('png')
      lastDataUrlRef.current = dataUrl ?? ''
      // Use the ref so we always call the latest onChange even if the parent re-rendered
      // between the stroke and this deferred export.
      onChangeRef.current({ dataUrl: lastDataUrlRef.current, paths: freshPaths })
    }, PNG_EXPORT_DEBOUNCE_MS)
  }

  // Detect stylus on first pen pointer-down event and enable palm rejection
  function handleContainerPointerDown(event: React.PointerEvent) {
    if (event.pointerType === 'pen' && !penMode) {
      setPenMode(true)
      localStorage.setItem(PEN_DETECTED_KEY, '1')
    }
  }

  function handleToolChange(nextTool: DrawingTool) {
    setTool(nextTool)
  }

  async function handleUndo() {
    canvasRef.current?.undo()
    await emitPathsThenSchedulePng()
  }

  async function handleRedo() {
    canvasRef.current?.redo()
    await emitPathsThenSchedulePng()
  }

  async function handleClear() {
    canvasRef.current?.clearCanvas()
    lastDataUrlRef.current = ''
    setStrokeCount(0)
    onChange({ dataUrl: '', paths: [] })
  }

  const visibleStrokeCount = strokeCount ?? initialPaths?.length ?? 0

  return (
    <div className="space-y-3.5">
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
                onClick={() => handleToolChange(item.id as DrawingTool)}
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

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[24px]"
        style={{
          minHeight: canvasHeight,
          touchAction: 'none',
          background: '#FAF7F4',
          border: '1px solid rgba(255,255,255,0.42)',
          boxShadow: '0 18px 42px rgba(120,110,130,0.10)',
        }}
        onPointerDown={handleContainerPointerDown}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height={`${canvasHeight}px`}
          strokeWidth={tool === 'highlighter' ? strokeWidth + 2.5 : strokeWidth}
          strokeColor={tool === 'eraser' ? '#FAF7F4' : tool === 'highlighter' ? `${strokeColor}66` : strokeColor}
          eraserWidth={strokeWidth * 3}
          canvasColor="#FAF7F4"
          backgroundImage={backgroundImage ?? undefined}
          exportWithBackgroundImage={Boolean(backgroundImage)}
          preserveBackgroundImageAspectRatio="none"
          onChange={(updatedPaths) => {
            setStrokeCount(updatedPaths.length)
          }}
          onStroke={async () => {
            await emitPathsThenSchedulePng()
          }}
          allowOnlyPointerType={penMode ? 'pen' : 'all'}
          style={{
            borderRadius: '24px',
            position: 'relative',
            background: 'transparent',
          }}
          svgStyle={{
            // Round caps and joins give strokes a natural pen/ink look instead of flat-ended segments.
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px]" style={{ color: 'var(--ink-cool-faint)' }}>
          {visibleStrokeCount === 0
            ? penMode
              ? 'Listo para escribir con Apple Pencil.'
              : 'Listo para escribir con Apple Pencil o mouse.'
            : `${visibleStrokeCount} trazos guardados en esta nota.`}
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
