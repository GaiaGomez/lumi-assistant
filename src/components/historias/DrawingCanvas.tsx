'use client'

import { useEffect, useRef, useState } from 'react'
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

function castPaths(paths: CanvasPath[]): ClinicalCanvasPath[] {
  return paths as ClinicalCanvasPath[]
}

export default function DrawingCanvas({
  onChange,
  initialPaths,
  backgroundImage,
  initialHeight = 640,
}: DrawingCanvasProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<DrawingTool>('pen')
  const [strokeWidth, setStrokeWidth] = useState(2.5)
  const [strokeColor, setStrokeColor] = useState(COLOR_OPTIONS[0].value)
  const [canvasHeight, setCanvasHeight] = useState(initialHeight)
  const [strokeCount, setStrokeCount] = useState<number | null>(null)

  useEffect(() => {
    canvasRef.current?.eraseMode(tool === 'eraser')
  }, [tool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.resetCanvas()
    if (initialPaths && initialPaths.length > 0) {
      canvas.loadPaths(initialPaths as CanvasPath[])
      return
    }
  }, [backgroundImage, initialPaths])

  useEffect(() => {
    function maybeGrowCanvas() {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const viewportBottom = window.innerHeight
      if (rect.bottom - viewportBottom <= CANVAS_GROW_OFFSET) {
        setCanvasHeight((currentHeight) => currentHeight + CANVAS_GROW_STEP)
      }
    }

    maybeGrowCanvas()
    window.addEventListener('scroll', maybeGrowCanvas, { passive: true })
    window.addEventListener('resize', maybeGrowCanvas)

    return () => {
      window.removeEventListener('scroll', maybeGrowCanvas)
      window.removeEventListener('resize', maybeGrowCanvas)
    }
  }, [])

  async function emitSnapshot() {
    const canvas = canvasRef.current
    if (!canvas) return

    const paths = castPaths(await canvas.exportPaths())
    setStrokeCount(paths.length)

    const dataUrl = paths.length > 0 ? await canvas.exportImage('png') : ''
    onChange({
      dataUrl: dataUrl ?? '',
      paths,
    })
  }

  function handleToolChange(nextTool: DrawingTool) {
    setTool(nextTool)
  }

  async function handleUndo() {
    canvasRef.current?.undo()
    await emitSnapshot()
  }

  async function handleRedo() {
    canvasRef.current?.redo()
    await emitSnapshot()
  }

  async function handleClear() {
    canvasRef.current?.clearCanvas()
    setStrokeCount(0)
    onChange({ dataUrl: '', paths: [] })
  }

  const visibleStrokeCount = strokeCount ?? initialPaths?.length ?? 0

  return (
    <div className="space-y-3.5">
      <div
        className="rounded-[22px] p-3"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.34) 100%)',
          border: '1px solid rgba(255,255,255,0.42)',
          boxShadow: '0 14px 36px rgba(124, 108, 128, 0.08)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm"
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

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.32)', color: 'var(--ink-cool-soft)' }}
              aria-label="Deshacer"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.32)', color: 'var(--ink-cool-soft)' }}
              aria-label="Rehacer"
            >
              <Redo2 size={16} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.32)', color: 'var(--state-cancel-text)' }}
              aria-label="Limpiar trazos"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
              Tinta
            </span>
            <div className="flex items-center gap-1.5">
              {COLOR_OPTIONS.map((option) => {
                const active = strokeColor === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStrokeColor(option.value)}
                    className="h-7 w-7 rounded-full"
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
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
              Grosor
            </span>
            <div className="flex items-center gap-1.5">
              {STROKE_OPTIONS.map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setStrokeWidth(width)}
                  className="flex h-8 min-w-8 items-center justify-center rounded-full px-2"
                  style={strokeWidth === width ? {
                    background: 'rgba(255,255,255,0.88)',
                    border: '1px solid rgba(255,255,255,0.64)',
                    color: 'var(--ink-cool-strong)',
                  } : {
                    background: 'rgba(255,255,255,0.24)',
                    border: '1px solid rgba(255,255,255,0.24)',
                    color: 'var(--ink-cool-soft)',
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{ width: width * 2 + 1, height: width * 2 + 1, background: 'currentColor' }}
                  />
                </button>
              ))}
            </div>
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
            await emitSnapshot()
          }}
          allowOnlyPointerType="all"
          style={{
            borderRadius: '24px',
            position: 'relative',
            background: 'transparent',
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs" style={{ color: 'var(--ink-cool-faint)' }}>
          {visibleStrokeCount === 0 ? 'Listo para escribir con Apple Pencil o mouse.' : `${visibleStrokeCount} trazos guardados en esta nota.`}
        </p>
        <p className="text-xs" style={{ color: 'var(--ink-cool-muted)' }}>
          Amplia el lienzo cuando necesites mas espacio visual.
        </p>
      </div>
    </div>
  )
}
