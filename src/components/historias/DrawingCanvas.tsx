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
  // imagen inicial si estamos editando una nota existente
  initialImage?: string
}

export default function DrawingCanvas({ onChange, initialImage }: DrawingCanvasProps) {
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
      {/* Barra de herramientas */}
      <div className="flex items-center gap-2 bg-stone-100 rounded-xl p-2">
        {/* Lápiz */}
        <button
          onClick={() => setTool('pen')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            tool === 'pen' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
          }`}
        >
          <Pen size={16} />
          Lápiz
        </button>

        {/* Borrador */}
        <button
          onClick={() => setTool('eraser')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            tool === 'eraser' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
          }`}
        >
          <Eraser size={16} />
          Borrador
        </button>

        {/* Grosor del trazo */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-stone-500">Grosor:</span>
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                strokeWidth === w ? 'ring-2 ring-stone-600 bg-stone-200' : 'bg-stone-300'
              }`}
            >
              <span
                className="rounded-full bg-stone-700"
                style={{ width: w * 1.5, height: w * 1.5 }}
              />
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1">
          {/* Deshacer */}
          <button onClick={handleUndo}
            className="p-2 hover:bg-white rounded-lg transition-colors text-stone-500">
            <Undo2 size={16} />
          </button>
          {/* Limpiar todo */}
          <button onClick={handleClear}
            className="p-2 hover:bg-white rounded-lg transition-colors text-stone-500">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* El canvas en sí */}
      {/* touchAction="none" — crucial para que el iPad no haga scroll mientras escribe */}
      <div
        className="border-2 border-stone-200 rounded-xl overflow-hidden bg-white cursor-crosshair"
        style={{ touchAction: 'none' }}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height="400px"
          strokeWidth={tool === 'eraser' ? strokeWidth * 4 : strokeWidth}
          strokeColor={tool === 'eraser' ? 'white' : '#1c1917'}
          // eraserWidth: en modo borrador el "trazo" es blanco
          eraserWidth={strokeWidth * 4}
          canvasColor="white"
          onStroke={handleStrokeEnd}
          // allowOnlyPointerType="pen" hace que SOLO el Apple Pencil dibuje
          // y el dedo pueda hacer scroll — fundamental para la experiencia iPad
          allowOnlyPointerType="all"
          style={{ borderRadius: '12px' }}
        />
      </div>

      <p className="text-xs text-stone-400 text-center">
        Escribe con Apple Pencil • Usa el dedo para hacer scroll
      </p>
    </div>
  )
}
