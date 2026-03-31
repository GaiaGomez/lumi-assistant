'use client'
// ============================================================
// DRAWING CANVAS — canvas de escritura con Apple Pencil
// react-sketch-canvas: maneja automáticamente eventos de stylus en iPad
// Detecta presión y ángulo del Pencil via Pointer Events API
// ============================================================

import { useRef, useState } from 'react'
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas'
import { Trash2, Undo2, Pen, Eraser } from 'lucide-react'

interface DrawingCanvasProps {
  // onChange se llama cada vez que Lu termina un trazo
  // recibe la imagen en base64 para que el padre pueda guardarla
  onChange: (dataUrl: string) => void
}

export default function DrawingCanvas({ onChange }: DrawingCanvasProps) {
  // useRef: acceso directo al DOM del canvas para llamar métodos como undo(), clearCanvas()
  const canvasRef = useRef<ReactSketchCanvasRef>(null)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [strokeWidth, setStrokeWidth] = useState(3)

  // Se ejecuta cuando termina cada trazo — exporta el canvas como base64 PNG
  async function handleStrokeEnd() {
    const dataUrl = await canvasRef.current?.exportImage('png')
    if (dataUrl) onChange(dataUrl)
  }

  function handleUndo() {
    canvasRef.current?.undo()
    handleStrokeEnd()  // re-exportamos después de deshacer
  }

  function handleClear() {
    canvasRef.current?.clearCanvas()
    onChange('')  // canvas vacío
  }

  return (
    <div className="space-y-3">

      {/* ── Barra de herramientas — glass neutro ── */}
      <div
        className="flex items-center gap-2 rounded-xl p-2"
        style={{ background: 'rgba(235,232,240,0.60)' }}
      >
        {/* Lápiz */}
        <button
          onClick={() => setTool('pen')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={tool === 'pen' ? {
            background: 'rgba(255,255,255,0.85)',
            color: '#444444',
            boxShadow: '0 1px 6px rgba(120,110,130,0.12)',
          } : {
            color: '#AAAAAA',
          }}
        >
          <Pen size={16} />
          Lápiz
        </button>

        {/* Borrador */}
        <button
          onClick={() => setTool('eraser')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={tool === 'eraser' ? {
            background: 'rgba(255,255,255,0.85)',
            color: '#444444',
            boxShadow: '0 1px 6px rgba(120,110,130,0.12)',
          } : {
            color: '#AAAAAA',
          }}
        >
          <Eraser size={16} />
          Borrador
        </button>

        {/* Grosor del trazo */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs" style={{ color: '#AAAAAA' }}>Grosor:</span>
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
              style={strokeWidth === w ? {
                background: 'rgba(150,140,165,0.18)',
                outline: '2px solid #B0A0BC',
                outlineOffset: '1px',
              } : {
                background: 'rgba(180,175,190,0.20)',
              }}
            >
              {/* Punto visual que escala con el grosor */}
              <span
                className="rounded-full"
                style={{ width: w * 1.5, height: w * 1.5, background: '#666666' }}
              />
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1">
          {/* Deshacer */}
          <button
            onClick={handleUndo}
            className="p-2 rounded-lg transition-all"
            style={{ color: '#AAAAAA' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Undo2 size={16} />
          </button>
          {/* Limpiar todo */}
          <button
            onClick={handleClear}
            className="p-2 rounded-lg transition-all"
            style={{ color: '#AAAAAA' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ── El canvas — fondo blanco cálido ── */}
      {/* touchAction="none" — crucial para que el iPad no haga scroll mientras escribe */}
      <div
        className="rounded-xl overflow-hidden cursor-crosshair"
        style={{
          touchAction: 'none',
          boxShadow: '0 2px 16px rgba(120,110,130,0.08)',
          overflow: 'hidden',
        }}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height="400px"
          strokeWidth={tool === 'eraser' ? strokeWidth * 4 : strokeWidth}
          strokeColor={tool === 'eraser' ? '#FAF8F5' : '#3D2E22'}
          eraserWidth={strokeWidth * 4}
          canvasColor="#FAF8F5"   // warm-white — más suave a la vista que blanco puro
          onStroke={handleStrokeEnd}
          allowOnlyPointerType="all"
          style={{ borderRadius: '10px' }}
        />
      </div>

      <p className="text-xs text-center" style={{ color: '#AAAAAA' }}>
        Escribe con Apple Pencil • Usa el dedo para hacer scroll
      </p>
    </div>
  )
}
